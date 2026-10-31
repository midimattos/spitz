"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; nome: string; registro: string | null; externo: boolean };

export function JuntarDuplicados({ grupo }: { grupo: Item[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function juntar(manterId: string, removerId: string) {
    const manter = grupo.find((g) => g.id === manterId)!;
    if (!window.confirm(`Juntar tudo em "${manter.nome}"? O outro cadastro será apagado e seus filhos, ninhadas e documentos passam para este.`)) return;
    setOcupado(true);
    setErro(null);
    const res = await fetch("/api/caes/mesclar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manterId, removerId }),
    }).catch(() => null);
    setOcupado(false);
    if (!res || !res.ok) {
      const d = res ? ((await res.json().catch(() => null)) as { error?: string } | null) : null;
      setErro(d?.error ?? "Não foi possível juntar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="px-5 py-3">
      {grupo.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm">
          <span>
            <strong>{c.nome}</strong>
            <span className="text-xs ml-2" style={{ color: "var(--ink-muted)" }}>
              {c.registro ?? "sem registro"} · {c.externo ? "outro canil" : "meu plantel"}
            </span>
          </span>
          {grupo.length === 2 && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => juntar(c.id, grupo.find((g) => g.id !== c.id)!.id)}
              className="text-xs px-3 py-1.5 rounded border disabled:opacity-60"
              style={{ borderColor: "var(--pine)", color: "var(--pine)" }}
            >
              Manter este e juntar o outro
            </button>
          )}
        </div>
      ))}
      {grupo.length > 2 && <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Há mais de dois cadastros iguais: junte de dois em dois abrindo cada ficha.</p>}
      {erro && <p className="mt-1 text-xs" style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
