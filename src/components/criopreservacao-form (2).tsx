"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const campoClasse = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const campoEstilo = { borderColor: "var(--border-hairline)" };

export function CriopreservacaoForm({ caes }: { caes: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch("/api/criopreservacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caoId: fd.get("caoId") || undefined,
        tipo: fd.get("tipo"),
        doses: parseInt(String(fd.get("doses")), 10),
        dataColeta: fd.get("dataColeta"),
        local: fd.get("local") || undefined,
        validade: fd.get("validade") || undefined,
        observacoes: fd.get("observacoes") || undefined,
      }),
    });
    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível salvar");
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Cão de origem</label>
        <select name="caoId" defaultValue="" className={campoClasse} style={campoEstilo}>
          <option value="">— não vinculado —</option>
          {caes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Material</label>
        <select name="tipo" required defaultValue="SEMEN" className={campoClasse} style={campoEstilo}>
          <option value="SEMEN">Sêmen</option>
          <option value="EMBRIAO">Embrião</option>
          <option value="OVULO">Óvulo</option>
        </select>
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Doses / palhetas</label>
        <input name="doses" type="number" min={1} required className={campoClasse} style={campoEstilo} />
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Data da coleta</label>
        <input name="dataColeta" type="date" required className={campoClasse} style={campoEstilo} />
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Onde está guardado</label>
        <input name="local" placeholder="Clínica, tanque, botijão…" className={campoClasse} style={campoEstilo} />
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Validade (gera aviso)</label>
        <input name="validade" type="date" className={campoClasse} style={campoEstilo} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Observações</label>
        <input name="observacoes" className={campoClasse} style={campoEstilo} />
      </div>
      {erro && <p className="text-sm sm:col-span-2" style={{ color: "#a32d2d" }}>{erro}</p>}
      <button
        type="submit"
        disabled={salvando}
        className="sm:col-span-2 px-6 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {salvando ? "Salvando…" : "Adicionar ao inventário"}
      </button>
    </form>
  );
}
