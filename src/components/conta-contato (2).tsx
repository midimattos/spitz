"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const campo = "px-3 py-2 rounded border bg-transparent";
const borda = { borderColor: "var(--border-hairline)" };

export function ContaEmail({ email, confirmado }: { email: string; confirmado: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function reenviar() {
    setEnviando(true);
    const res = await fetch("/api/conta/reenviar-email", { method: "POST" });
    setMsg(res.ok ? "Enviamos um novo link. Confira também o spam." : (await res.json().catch(() => ({}))).error ?? "Não foi possível enviar.");
    setEnviando(false);
  }

  return (
    <div>
      <p className="text-sm">
        {email}{" "}
        <span style={{ color: confirmado ? "var(--pine)" : "#a06a2e" }}>{confirmado ? "✓ confirmado" : "• aguardando confirmação"}</span>
      </p>
      {!confirmado && (
        <div className="mt-3">
          <button onClick={reenviar} disabled={enviando} className="px-4 py-2 rounded border text-sm disabled:opacity-60" style={borda}>
            {enviando ? "Enviando…" : "Reenviar e-mail de confirmação"}
          </button>
          {msg && <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>{msg}</p>}
        </div>
      )}
    </div>
  );
}

export function ContaWhatsapp({
  verificado,
  numeroAtual,
  pendente,
  automatico,
}: {
  verificado: boolean;
  numeroAtual: string | null;
  pendente: string | null;
  automatico: boolean;
}) {
  const router = useRouter();
  const [numero, setNumero] = useState(pendente ?? "");
  const [etapa, setEtapa] = useState<"numero" | "codigo" | "manual">(pendente && !automatico ? "manual" : "numero");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (verificado) {
    return (
      <p className="text-sm">
        {numeroAtual} <span style={{ color: "var(--pine)" }}>✓ confirmado</span>
      </p>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    const res = await fetch("/api/conta/whatsapp/enviar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ numero }) });
    const dados = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(dados.error ?? "Não foi possível enviar.");
    setEtapa(dados.manual ? "manual" : "codigo");
  }

  async function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    const codigo = String(new FormData(e.currentTarget).get("codigo") ?? "");
    const res = await fetch("/api/conta/whatsapp/confirmar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo }) });
    const dados = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(dados.error ?? "Código incorreto.");
    router.refresh();
  }

  if (etapa === "manual") {
    return (
      <div className="text-sm">
        <p>
          Número informado: <strong>{numero}</strong>. A equipe vai confirmá-lo em breve e você será liberado automaticamente.
        </p>
        <button className="mt-2 underline text-xs" style={{ color: "var(--ink-muted)" }} onClick={() => setEtapa("numero")}>
          Trocar número
        </button>
      </div>
    );
  }

  if (etapa === "codigo") {
    return (
      <form onSubmit={confirmar} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Código enviado ao seu WhatsApp</label>
          <input name="codigo" inputMode="numeric" pattern="\d{6}" maxLength={6} required className={`${campo} block mt-1 w-40 tracking-widest`} style={borda} />
        </div>
        <button disabled={ocupado} className="px-4 py-2 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
          Confirmar
        </button>
        <button type="button" className="text-xs underline" style={{ color: "var(--ink-muted)" }} onClick={() => setEtapa("numero")}>
          Trocar número
        </button>
        {erro && <p className="w-full text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Seu WhatsApp (com DDD)</label>
        <input value={numero} onChange={(e) => setNumero(e.target.value)} required placeholder="(53) 99999-9999" className={`${campo} block mt-1 w-56`} style={borda} />
      </div>
      <button disabled={ocupado} className="px-4 py-2 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
        {automatico ? "Enviar código" : "Enviar para confirmação"}
      </button>
      {erro && <p className="w-full text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
    </form>
  );
}
