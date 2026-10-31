"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/tabs";
import { FichaCaoCampos } from "@/components/ficha-cao-campos";
import { ArvoreEditor, arvoreParaEnvio } from "@/components/arvore-editor";
import { acharDuplicado } from "@/lib/duplicados";
import { mensagemDeErro } from "@/lib/imagem-cliente";
import { fichaVazia, type FichaCao } from "@/lib/ficha-cao";
import type { CaoNaArvore, MapaArvore } from "@/lib/arvore-nos";

const borda = { borderColor: "var(--border-hairline)" };

export function CadastroCaoArvore({ caesExistentes, principalExterno }: { caesExistentes: CaoNaArvore[]; principalExterno?: boolean }) {
  const router = useRouter();
  const [sexo, setSexo] = useState<"MACHO" | "FEMEA">("MACHO");
  const [cao, setCao] = useState<FichaCao>(fichaVazia({ externo: !!principalExterno }));
  const [arvore, setArvore] = useState<MapaArvore>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const nAncestrais = Object.values(arvore).filter((s) => (s.modo === "existente" ? true : s.modo === "novo" ? !!s.ficha.nome.trim() : false)).length;
  const dupPrincipal = cao.nome.trim() ? acharDuplicado(caesExistentes, { nome: cao.nome, sexo, registro: cao.registro, microchip: cao.microchip }) : null;

  async function salvar() {
    setErro(null);
    if (!cao.nome.trim()) {
      setErro('Informe o nome do cão na aba "Cão".');
      return;
    }
    if (dupPrincipal) {
      setErro(`${dupPrincipal.cao.nome} já está cadastrado. Para não duplicar, abra a ficha dele no plantel.`);
      return;
    }
    setSalvando(true);
    const res = await fetch("/api/caes/arvore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cao: { ...cao, sexo }, arvore: arvoreParaEnvio(arvore, false) }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setSalvando(false);
      setErro(res ? await mensagemDeErro(res, "Não foi possível salvar") : "Sem conexão. Tente novamente.");
      return;
    }
    const dados = (await res.json()) as { id: string };
    router.push(`/dashboard/criador/plantel/${dados.id}`);
    router.refresh();
  }

  const abaCao = (
    <div className="space-y-4">
      {dupPrincipal && (
        <div className="rounded border p-3 text-sm" style={{ borderColor: "#a32d2d", background: "#fbeaea" }}>
          <strong>{dupPrincipal.cao.nome}</strong> já está cadastrado
          {dupPrincipal.motivo === "registro" ? " com este registro" : dupPrincipal.motivo === "microchip" ? " com este microchip" : " com este nome e sexo"}. Não é possível cadastrar de novo. Abra a ficha dele no plantel para completar os dados.
        </div>
      )}
      <FichaCaoCampos ficha={cao} onChange={setCao} titulo="Dados do cão" mostrarSexo sexo={sexo} onSexo={setSexo} />
    </div>
  );

  return (
    <div>
      <Tabs
        abas={[
          { id: "cao", label: "Cão", conteudo: abaCao },
          {
            id: "arvore",
            label: `Árvore genealógica${nAncestrais ? ` (${nAncestrais})` : ""}`,
            conteudo: <ArvoreEditor caes={caesExistentes} mapa={arvore} onChange={setArvore} />,
          },
        ]}
      />

      <div className="mt-8 pt-6 border-t" style={borda}>
        {erro && (
          <p className="mb-3 text-sm" style={{ color: "#a32d2d" }}>
            {erro}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={salvar} disabled={salvando} className="px-6 py-2.5 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
            {salvando ? "Salvando…" : "Salvar cadastro"}
          </button>
          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Será salvo o cão{nAncestrais ? ` e ${nAncestrais} ancestral(is)` : ""}. Fotos e demais dados podem ser completados depois.
          </span>
        </div>
      </div>
    </div>
  );
}
