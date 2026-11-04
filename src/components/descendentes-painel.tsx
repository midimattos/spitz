"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararImagem, mensagemDeErro } from "@/lib/imagem-cliente";
import { ATRIBUTOS_NOME, nomeMaiusculo } from "@/lib/texto";

export type DescendenteItem = {
  id: string;
  nome: string;
  dataNascimento: string | null; // ISO
  cor: string | null;
  fotoUrl: string | null;
  outroGenitor: string | null;
  tutorNome: string | null;
  mostrarTutor: boolean;
  exibirPublico: boolean;
};

const borda = { borderColor: "var(--border-hairline)" };
const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const rot = { color: "var(--ink-muted)" };

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : null;
}

/** Vitrine "Descendentes": filhotes que o cão já teve, com foto, nome, nascimento e tutor. */
export function DescendentesPainel({ caoId, itens }: { caoId: string; itens: DescendenteItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [tutor, setTutor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome do filhote.");
      return;
    }
    setSalvando(true);
    const fd = new FormData(e.currentTarget);
    fd.set("nome", nome);
    if (!fd.get("exibirPublico")) fd.set("exibirPublico", "0");
    fd.delete("foto");
    if (foto) fd.set("foto", await prepararImagem(foto));
    const res = await fetch(`/api/caes/${caoId}/descendentes`, { method: "POST", body: fd }).catch(() => null);
    setSalvando(false);
    if (!res || !res.ok) {
      setErro(res ? await mensagemDeErro(res, "Não foi possível salvar") : "Sem conexão. Tente novamente.");
      return;
    }
    formRef.current?.reset();
    setNome("");
    setFoto(null);
    setTutor("");
    setAberto(false);
    router.refresh();
  }

  async function alternar(id: string, campoNome: "exibirPublico" | "mostrarTutor", valor: boolean) {
    await fetch(`/api/descendentes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [campoNome]: valor }) });
    router.refresh();
  }

  async function remover(id: string, n: string) {
    if (!window.confirm(`Remover ${n} da lista de descendentes?`)) return;
    await fetch(`/api/descendentes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl" style={{ color: "var(--pine)" }}>
            Descendentes
          </h3>
          <p className="text-xs" style={rot}>
            Filhotes que este cão já teve. Quem procura filhote vê como os descendentes são bonitos.
          </p>
        </div>
        <button type="button" onClick={() => setAberto(!aberto)} className="px-4 py-2 rounded text-white text-sm" style={{ background: "var(--pine)" }}>
          {aberto ? "Fechar" : "+ Adicionar filhote"}
        </button>
      </div>

      {aberto && (
        <form ref={formRef} onSubmit={salvar} className="card mt-4 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm" style={rot}>Nome do filhote</label>
              <input value={nome} onChange={(e) => setNome(nomeMaiusculo(e.target.value))} className={campo} {...ATRIBUTOS_NOME} style={{ ...borda, ...ATRIBUTOS_NOME.style }} />
            </div>
            <div>
              <label className="text-sm" style={rot}>Data de nascimento</label>
              <input type="date" name="dataNascimento" className={campo} style={borda} />
            </div>
            <div>
              <label className="text-sm" style={rot}>Cor</label>
              <input name="cor" className={campo} style={borda} />
            </div>
            <div>
              <label className="text-sm" style={rot}>Outro pai/mãe (opcional)</label>
              <input name="outroGenitor" className={campo} style={borda} />
            </div>
            <div>
              <label className="text-sm" style={rot}>Foto</label>
              <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="mt-1 block text-sm" />
            </div>
            <div>
              <label className="text-sm" style={rot}>Nome do cliente que comprou (opcional)</label>
              <input name="tutorNome" value={tutor} onChange={(e) => setTutor(e.target.value)} className={campo} style={borda} />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="exibirPublico" value="1" defaultChecked /> Mostrar este filhote na página pública
            </label>
            {tutor.trim() && (
              <label className="flex items-center gap-2">
                <input type="checkbox" name="mostrarTutor" value="1" /> O cliente autorizou mostrar o nome dele publicamente
              </label>
            )}
          </div>
          {erro && <p className="text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
          <button type="submit" disabled={salvando} className="px-5 py-2 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
            {salvando ? "Salvando…" : "Salvar filhote"}
          </button>
        </form>
      )}

      {itens.length === 0 ? (
        <p className="mt-4 text-sm" style={rot}>Nenhum filhote cadastrado ainda.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {itens.map((d) => (
            <div key={d.id} className="card overflow-hidden text-sm">
              {d.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.fotoUrl} alt={d.nome} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-xs" style={{ ...rot, background: "var(--parchment)" }}>sem foto</div>
              )}
              <div className="p-3 space-y-0.5">
                <p className="font-medium" style={{ color: "var(--pine)" }}>{d.nome}</p>
                <p className="text-xs" style={rot}>
                  {[data(d.dataNascimento) && `nasc. ${data(d.dataNascimento)}`, d.cor].filter(Boolean).join(" · ")}
                </p>
                {d.outroGenitor && <p className="text-xs" style={rot}>com {d.outroGenitor}</p>}
                {d.tutorNome && <p className="text-xs">Tutor: {d.tutorNome}</p>}
                <div className="pt-2 space-y-1 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={d.exibirPublico} onChange={(e) => alternar(d.id, "exibirPublico", e.target.checked)} /> público
                  </label>
                  {d.tutorNome && (
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={d.mostrarTutor} onChange={(e) => alternar(d.id, "mostrarTutor", e.target.checked)} /> mostrar tutor
                    </label>
                  )}
                  <button type="button" onClick={() => remover(d.id, d.nome)} className="underline" style={{ color: "#a32d2d" }}>remover</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
