"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminVendaAcoes({ vendaId, excluida, confirmada }: { vendaId: string; excluida: boolean; confirmada: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  async function agir(acao: "excluir" | "restaurar" | "confirmar") {
    setSalvando(true);
    await fetch(`/api/admin/vendas/${vendaId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao }) });
    setSalvando(false);
    router.refresh();
  }
  return (
    <span className="flex gap-3 text-xs">
      {!confirmada && !excluida && <button disabled={salvando} onClick={() => agir("confirmar")} className="underline" style={{ color: "var(--pine)" }}>Confirmei por contato</button>}
      {excluida ? (
        <button disabled={salvando} onClick={() => agir("restaurar")} className="underline" style={{ color: "var(--pine)" }}>Restaurar</button>
      ) : (
        <button disabled={salvando} onClick={() => agir("excluir")} className="underline" style={{ color: "#a32d2d" }}>Excluir dos dados</button>
      )}
    </span>
  );
}
