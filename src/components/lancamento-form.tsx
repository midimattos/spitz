"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS_SUGERIDAS } from "@/lib/financeiro";

const campoClasse = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const campoEstilo = { borderColor: "var(--border-hairline)" };

type CaoOpcao = { id: string; nome: string };

export function LancamentoForm({
  caoId,
  caesDisponiveis,
}: {
  caoId?: string;
  caesDisponiveis?: CaoOpcao[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const formData = new FormData(e.currentTarget);
    const data = formData.get("data") as string;

    const payload = {
      caoId: caoId ?? (formData.get("caoId") as string) ?? "",
      tipo: formData.get("tipo"),
      categoria: formData.get("categoria"),
      valor: parseFloat(String(formData.get("valor")).replace(",", ".")),
      data: data ? new Date(data).toISOString() : new Date().toISOString(),
      descricao: formData.get("descricao") || undefined,
    };

    const res = await fetch("/api/financeiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSalvando(false);

    if (!res.ok) {
      const errData = await res.json();
      setErro(errData.error ?? "Não foi possível salvar o lançamento");
      return;
    }

    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Tipo
          </label>
          <select name="tipo" required className={campoClasse} style={campoEstilo}>
            <option value="DESPESA">Despesa</option>
            <option value="RECEITA">Receita</option>
          </select>
        </div>
        <div>
          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Categoria
          </label>
          <input
            name="categoria"
            list="categorias-sugeridas"
            required
            className={campoClasse}
            style={campoEstilo}
          />
          <datalist id="categorias-sugeridas">
            {CATEGORIAS_SUGERIDAS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Valor (R$)
          </label>
          <input
            name="valor"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            required
            className={campoClasse}
            style={campoEstilo}
          />
        </div>
        <div>
          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Data
          </label>
          <input
            name="data"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={campoClasse}
            style={campoEstilo}
          />
        </div>
      </div>

      {!caoId && caesDisponiveis && (
        <div>
          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Cão (opcional)
          </label>
          <select name="caoId" defaultValue="" className={campoClasse} style={campoEstilo}>
            <option value="">— lançamento geral do canil —</option>
            {caesDisponiveis.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
          Descrição (opcional)
        </label>
        <input name="descricao" className={campoClasse} style={campoEstilo} />
      </div>

      {erro && (
        <p className="text-sm" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="px-5 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {salvando ? "Salvando…" : "Lançar"}
      </button>
    </form>
  );
}
