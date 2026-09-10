"use client";

import { useState } from "react";

export type AbaConteudo = { id: string; label: string; conteudo: React.ReactNode };

export function Tabs({ abas, abaInicial }: { abas: AbaConteudo[]; abaInicial?: string }) {
  const [ativa, setAtiva] = useState(abaInicial ?? abas[0]?.id);

  return (
    <div>
      <div
        className="flex flex-wrap gap-1 border-b overflow-x-auto"
        style={{ borderColor: "var(--border-hairline)" }}
      >
        {abas.map((aba) => {
          const selecionada = ativa === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAtiva(aba.id)}
              className="px-4 py-2.5 text-sm whitespace-nowrap -mb-px border-b-2 transition-colors"
              style={{
                borderColor: selecionada ? "var(--pine)" : "transparent",
                color: selecionada ? "var(--pine)" : "var(--ink-muted)",
                fontWeight: selecionada ? 600 : 400,
              }}
            >
              {aba.label}
            </button>
          );
        })}
      </div>

      <div className="pt-8">{abas.find((a) => a.id === ativa)?.conteudo}</div>
    </div>
  );
}
