"use client";

import { useState } from "react";

export function ConfirmarCompra({ token }: { token: string }) {
  const [feito, setFeito] = useState<null | boolean>(null);
  const [enviando, setEnviando] = useState(false);
  async function responder(comprei: boolean) {
    setEnviando(true);
    await fetch(`/api/confirmar/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comprei }) });
    setEnviando(false);
    setFeito(comprei);
  }
  if (feito !== null) return <p className="card p-5 text-sm" style={{ color: "var(--pine)" }}>{feito ? "Obrigado! Compra confirmada." : "Obrigado pelo aviso. Registramos que você não comprou este filhote."}</p>;
  return (
    <div className="flex gap-3 mt-4">
      <button disabled={enviando} onClick={() => responder(true)} className="px-5 py-2 rounded text-white text-sm" style={{ background: "var(--pine)" }}>Sim, comprei</button>
      <button disabled={enviando} onClick={() => responder(false)} className="px-5 py-2 rounded border text-sm" style={{ borderColor: "var(--border-hairline)" }}>Não comprei</button>
    </div>
  );
}
