"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OPCOES_COR_BASE, OPCOES_MARCACAO, OPCOES_DILUICAO, OPCOES_MERLE } from "@/lib/genetica-cor";

type Desejo = {
  porte?: string | null;
  sexo?: string | null;
  precoMin?: number | null;
  precoMax?: number | null;
  corBase?: string | null;
  marcacao?: string | null;
  diluicao?: string | null;
  merle?: string | null;
  corPelagem?: string | null;
  estado?: string | null;
  cidade?: string | null;
  telefone?: string | null;
  cpf?: string | null;
} | null;

const campoClasse = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const campoEstilo = { borderColor: "var(--border-hairline)" };

export function DesejoForm({ desejoInicial }: { desejoInicial: Desejo }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    setSalvando(true);

    const formData = new FormData(e.currentTarget);
    const precoMax = formData.get("precoMax");
    const precoMin = formData.get("precoMin");
    const num = (v: FormDataEntryValue | null) => (v ? parseFloat(String(v).replace(/\./g, "").replace(",", ".")) : undefined);

    const res = await fetch("/api/desejos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        porte: formData.get("porte") || undefined,
        sexo: formData.get("sexo") || undefined,
        precoMin: num(precoMin),
        precoMax: num(precoMax),
        corBase: formData.get("corBase") || undefined,
        marcacao: formData.get("marcacao") || undefined,
        diluicao: formData.get("diluicao") || undefined,
        merle: formData.get("merle") || undefined,
        estado: formData.get("estado") || undefined,
        cidade: formData.get("cidade") || undefined,
        telefone: formData.get("telefone"),
        cpf: formData.get("cpf") || undefined,
      }),
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível salvar seu desejo");
      return;
    }

    setSalvo(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Porte desejado
          </label>
          <select name="porte" defaultValue={desejoInicial?.porte ?? ""} className={campoClasse} style={campoEstilo}>
            <option value="">Qualquer</option>
            <option value="Anão">Anão</option>
            <option value="Pequeno">Pequeno</option>
            <option value="Médio">Médio</option>
          </select>
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Sexo desejado
          </label>
          <select name="sexo" defaultValue={desejoInicial?.sexo ?? ""} className={campoClasse} style={campoEstilo}>
            <option value="">Qualquer</option>
            <option value="MACHO">Macho</option>
            <option value="FEMEA">Fêmea</option>
          </select>
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
        Nenhum campo é obrigatório, mas quanto mais você preencher, melhores serão os resultados.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          ["corBase", "Cor base", OPCOES_COR_BASE, desejoInicial?.corBase],
          ["marcacao", "Marcação", OPCOES_MARCACAO, desejoInicial?.marcacao],
          ["diluicao", "Diluição", OPCOES_DILUICAO, desejoInicial?.diluicao],
          ["merle", "Merle", OPCOES_MERLE, desejoInicial?.merle],
        ].map(([nome, titulo, opcoes, valor]) => (
          <div key={nome as string}>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>{titulo as string}</label>
            <select name={nome as string} defaultValue={(valor as string | null | undefined) ?? ""} className={campoClasse} style={campoEstilo}>
              <option value="">Qualquer</option>
              {(opcoes as string[]).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Valor a partir de (R$)</label>
          <input name="precoMin" inputMode="decimal" defaultValue={desejoInicial?.precoMin ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Valor até (R$)</label>
          <input name="precoMax" inputMode="decimal" defaultValue={desejoInicial?.precoMax ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Estado (UF)</label>
          <input name="estado" maxLength={2} defaultValue={desejoInicial?.estado ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Cidade</label>
          <input name="cidade" defaultValue={desejoInicial?.cidade ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: "var(--border-hairline)" }}>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            WhatsApp *
          </label>
          <input
            name="telefone"
            required
            placeholder="(11) 91234-5678"
            defaultValue={desejoInicial?.telefone ?? ""}
            className={campoClasse}
            style={campoEstilo}
          />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            CPF (opcional)
          </label>
          <input name="cpf" defaultValue={desejoInicial?.cpf ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
        * Seu WhatsApp só é revelado ao criador se ele também aceitar o
        match (double opt-in) — nunca é exibido publicamente.
      </p>

      {erro && (
        <p className="text-sm" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}
      {salvo && (
        <p className="text-sm" style={{ color: "var(--pine)" }}>
          Desejo salvo!
        </p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="px-6 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {salvando ? "Salvando…" : "Salvar desejo"}
      </button>
    </form>
  );
}
