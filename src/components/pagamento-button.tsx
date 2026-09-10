"use client";

import { useState } from "react";

export function PagamentoButton({
  endpoint,
  body,
  label,
  labelCarregando = "Redirecionando…",
  className,
  style,
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  label: string;
  labelCarregando?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function iniciarPagamento() {
    setErro(null);
    setCarregando(true);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível iniciar o pagamento");
      setCarregando(false);
      return;
    }

    const data = await res.json();
    window.location.href = data.initPoint;
  }

  return (
    <div>
      <button
        type="button"
        onClick={iniciarPagamento}
        disabled={carregando}
        className={className}
        style={{ ...style, opacity: carregando ? 0.6 : 1 }}
      >
        {carregando ? labelCarregando : label}
      </button>
      {erro && (
        <p className="mt-2 text-xs" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
