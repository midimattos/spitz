"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Desejo = {
  porte?: string | null;
  sexo?: string | null;
  precoMax?: number | null;
  corPelagem?: string | null;
  estado?: string | null;
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

    const res = await fetch("/api/desejos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        porte: formData.get("porte") || undefined,
        sexo: formData.get("sexo") || undefined,
        precoMax: precoMax ? parseFloat(String(precoMax).replace(",", ".")) : undefined,
        corPelagem: formData.get("corPelagem") || undefined,
        estado: formData.get("estado") || undefined,
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

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Preço máximo (R$)
          </label>
          <input
            name="precoMax"
            inputMode="decimal"
            defaultValue={desejoInicial?.precoMax ?? ""}
            className={campoClasse}
            style={campoEstilo}
          />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Cor de preferência
          </label>
          <input name="corPelagem" defaultValue={desejoInicial?.corPelagem ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
      </div>

      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Estado (UF)
        </label>
        <input name="estado" maxLength={2} defaultValue={desejoInicial?.estado ?? ""} className={campoClasse} style={campoEstilo} />
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
