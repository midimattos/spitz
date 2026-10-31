"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const est = { borderColor: "var(--border-hairline)" };
type R = { id: string; compradorNome: string; compradorEmail: string | null; valorSinal: number | null; criadoEm: string };

export function ReservaPainel({ anuncioId, reservas }: { anuncioId: string; reservas: R[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const f = new FormData(e.currentTarget);
    const sinal = String(f.get("valorSinal") ?? "").replace(/\./g, "").replace(",", ".");
    const res = await fetch(`/api/anuncios/${anuncioId}/reservas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compradorNome: String(f.get("nome") ?? ""),
        compradorEmail: String(f.get("email") ?? ""),
        valorSinal: sinal ? parseFloat(sinal) : undefined,
      }),
    });
    if (!res.ok) {
      setErro((await res.json().catch(() => ({}))).error ?? "Não foi possível reservar");
      return;
    }
    setAberto(false);
    router.refresh();
  }

  async function cancelar(id: string) {
    await fetch(`/api/reservas/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      {reservas.length > 0 && (
        <ul className="text-sm divide-y mb-3" style={{ borderColor: "var(--border-hairline)" }}>
          {reservas.map((r) => (
            <li key={r.id} className="py-2 flex justify-between gap-3">
              <span>
                {r.compradorNome}
                {r.compradorEmail ? ` · ${r.compradorEmail}` : ""}
                {r.valorSinal ? ` · sinal de R$ ${r.valorSinal.toLocaleString("pt-BR")}` : ""}
              </span>
              <button onClick={() => cancelar(r.id)} className="underline text-xs" style={{ color: "#a32d2d" }}>Cancelar reserva</button>
            </li>
          ))}
        </ul>
      )}
      {aberto ? (
        <form onSubmit={criar} className="flex flex-wrap gap-2 items-end">
          <input name="nome" required placeholder="Nome do comprador" className="px-2 py-1.5 rounded border bg-transparent text-sm" style={est} />
          <input name="email" type="email" placeholder="E-mail (opcional)" className="px-2 py-1.5 rounded border bg-transparent text-sm" style={est} />
          <input name="valorSinal" placeholder="Sinal combinado (R$)" className="px-2 py-1.5 rounded border bg-transparent text-sm w-40" style={est} />
          <button className="px-4 py-1.5 rounded text-white text-sm" style={{ background: "var(--pine)" }}>Salvar reserva</button>
          <button type="button" onClick={() => setAberto(false)} className="px-3 py-1.5 rounded border text-sm" style={est}>Cancelar</button>
        </form>
      ) : (
        <button onClick={() => setAberto(true)} className="px-4 py-1.5 rounded border text-sm" style={est}>Registrar reserva</button>
      )}
      {erro && <p className="text-xs mt-2" style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
