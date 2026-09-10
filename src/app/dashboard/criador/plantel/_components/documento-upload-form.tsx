"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TIPOS = [
  { value: "PEDIGREE", label: "Pedigree" },
  { value: "RECIBO_VETERINARIO", label: "Recibo veterinário" },
  { value: "MICROCHIP", label: "Microchip" },
  { value: "CONTRATO_COPROPRIEDADE", label: "Contrato de copropriedade" },
  { value: "LAUDO_MEDICO", label: "Laudo médico" },
  { value: "OUTRO", label: "Outro" },
];

export function DocumentoUploadForm({ caoId }: { caoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch(`/api/caes/${caoId}/documentos`, {
      method: "POST",
      body: formData,
    });

    setEnviando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível enviar o documento");
      return;
    }

    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
          Tipo
        </label>
        <select
          name="tipo"
          className="px-2 py-1.5 rounded border bg-transparent text-sm"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
          Nome (opcional)
        </label>
        <input
          name="nome"
          className="px-2 py-1.5 rounded border bg-transparent text-sm"
          style={{ borderColor: "var(--border-hairline)" }}
        />
      </div>

      <div>
        <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
          Arquivo
        </label>
        <input
          name="arquivo"
          type="file"
          required
          className="text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="px-4 py-1.5 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {enviando ? "Enviando…" : "Anexar"}
      </button>

      {erro && (
        <p className="text-sm w-full" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}
    </form>
  );
}
