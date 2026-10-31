"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const campoClasse = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const campoEstilo = { borderColor: "var(--border-hairline)" };

export function CuidadoForm({ caes }: { caes: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch("/api/cuidados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caoId: fd.get("caoId"),
        tipo: fd.get("tipo"),
        nome: fd.get("nome"),
        data: fd.get("data"),
        proximaData: fd.get("proximaData") || undefined,
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
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Cão</label>
        <select name="caoId" required defaultValue="" className={campoClasse} style={campoEstilo}>
          <option value="" disabled>Selecione</option>
          {caes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Tipo</label>
        <select name="tipo" required defaultValue="VACINA" className={campoClasse} style={campoEstilo}>
          <option value="VACINA">Vacina</option>
          <option value="VERMIFUGO">Vermífugo</option>
          <option value="ANTIPULGAS">Antipulgas / carrapatos</option>
          <option value="CONSULTA">Consulta</option>
          <option value="OUTRO">Outro</option>
        </select>
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Nome</label>
        <input name="nome" required placeholder="Ex.: V10, antirrábica, Drontal" className={campoClasse} style={campoEstilo} />
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Data de aplicação</label>
        <input name="data" type="date" required className={campoClasse} style={campoEstilo} />
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Próxima dose (gera aviso)</label>
        <input name="proximaData" type="date" className={campoClasse} style={campoEstilo} />
      </div>
      <div>
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
        {salvando ? "Salvando…" : "Registrar"}
      </button>
    </form>
  );
}
