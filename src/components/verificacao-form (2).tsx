"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CanilDados = {
  nome: string;
  descricao: string | null;
  cidade: string | null;
  estado: string | null;
  telefoneContato: string | null;
  instagram: string | null;
};

const campoClasse = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const campoEstilo = { borderColor: "var(--border-hairline)" };

export function VerificacaoForm({
  canil,
  jaSolicitado,
}: {
  canil: CanilDados;
  jaSolicitado: boolean;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/canil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: formData.get("nome"),
        descricao: formData.get("descricao") || undefined,
        cidade: formData.get("cidade") || undefined,
        estado: formData.get("estado") || undefined,
        telefoneContato: formData.get("telefoneContato") || undefined,
        instagram: formData.get("instagram") || undefined,
        solicitarVerificacao: true,
      }),
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível salvar");
      return;
    }

    setEnviado(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Nome do canil
        </label>
        <input name="nome" defaultValue={canil.nome} required className={campoClasse} style={campoEstilo} />
      </div>

      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Descrição
        </label>
        <textarea name="descricao" rows={3} defaultValue={canil.descricao ?? ""} className={campoClasse} style={campoEstilo} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Cidade
          </label>
          <input name="cidade" defaultValue={canil.cidade ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Estado (UF)
          </label>
          <input name="estado" maxLength={2} defaultValue={canil.estado ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Telefone de contato
          </label>
          <input name="telefoneContato" defaultValue={canil.telefoneContato ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Instagram
          </label>
          <input name="instagram" placeholder="@seucanil" defaultValue={canil.instagram ?? ""} className={campoClasse} style={campoEstilo} />
        </div>
      </div>

      {erro && (
        <p className="text-sm" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}
      {enviado && (
        <p className="text-sm" style={{ color: "var(--pine)" }}>
          Dados salvos e verificação solicitada. A equipe vai revisar em breve.
        </p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="px-6 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {salvando ? "Enviando…" : jaSolicitado ? "Atualizar e reenviar" : "Salvar e solicitar verificação"}
      </button>
    </form>
  );
}
