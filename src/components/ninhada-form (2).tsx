"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MachoOpcao = { id: string; nome: string };

export function NinhadaForm({
  caoMaeId,
  machosDisponiveis,
}: {
  caoMaeId: string;
  machosDisponiveis: MachoOpcao[];
}) {
  const router = useRouter();
  const [usarPadreadorExterno, setUsarPadreadorExterno] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const formData = new FormData(e.currentTarget);
    const dataCobertura = formData.get("dataCobertura") as string;

    const res = await fetch("/api/ninhadas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caoMaeId,
        caoPaiId: usarPadreadorExterno ? "" : formData.get("caoPaiId") || "",
        padreadorExterno: usarPadreadorExterno ? formData.get("padreadorExterno") : undefined,
        dataCobertura: new Date(dataCobertura).toISOString(),
        observacoes: formData.get("observacoes") || undefined,
      }),
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível registrar a ninhada");
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
            Data da cobertura
          </label>
          <input
            name="dataCobertura"
            type="date"
            required
            className="mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          />
        </div>

        <div>
          <label className="text-xs flex items-center justify-between" style={{ color: "var(--ink-muted)" }}>
            Padreador
            <button
              type="button"
              onClick={() => setUsarPadreadorExterno((v) => !v)}
              className="underline"
              style={{ color: "var(--brass)" }}
            >
              {usarPadreadorExterno ? "usar do plantel" : "é de outro canil"}
            </button>
          </label>
          {usarPadreadorExterno ? (
            <input
              name="padreadorExterno"
              placeholder="Nome do padreador e canil"
              className="mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm"
              style={{ borderColor: "var(--border-hairline)" }}
            />
          ) : (
            <select
              name="caoPaiId"
              className="mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm"
              style={{ borderColor: "var(--border-hairline)" }}
            >
              <option value="">— selecione —</option>
              {machosDisponiveis.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
          Observações
        </label>
        <input
          name="observacoes"
          className="mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm"
          style={{ borderColor: "var(--border-hairline)" }}
        />
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
        {salvando ? "Salvando…" : "Registrar ninhada"}
      </button>
    </form>
  );
}
