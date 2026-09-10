"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CaoOpcao = { id: string; nome: string; precoSugerido: number | null };

const campoClasse = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const campoEstilo = { borderColor: "var(--border-hairline)" };

export function AnuncioForm({ caesDisponiveis }: { caesDisponiveis: CaoOpcao[] }) {
  const router = useRouter();
  const [preco, setPreco] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function handleSelecionarCao(e: React.ChangeEvent<HTMLSelectElement>) {
    const caoId = e.target.value;
    const cao = caesDisponiveis.find((c) => c.id === caoId);
    if (cao?.precoSugerido) setPreco(cao.precoSugerido.toFixed(2).replace(".", ","));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/anuncios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caoId: formData.get("caoId"),
        titulo: formData.get("titulo"),
        descricao: formData.get("descricao") || undefined,
        preco: parseFloat(String(formData.get("preco")).replace(",", ".")),
      }),
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível criar o anúncio");
      return;
    }

    const anuncio = await res.json();
    router.push(`/dashboard/criador/anuncios/${anuncio.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Cão
        </label>
        <select
          name="caoId"
          required
          onChange={handleSelecionarCao}
          className={campoClasse}
          style={campoEstilo}
        >
          <option value="">— selecione —</option>
          {caesDisponiveis.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
              {c.precoSugerido ? ` (sugestão: R$ ${c.precoSugerido.toFixed(0)})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Título do anúncio
        </label>
        <input name="titulo" required placeholder="Ex: Filhote de Spitz Alemão laranja" className={campoClasse} style={campoEstilo} />
      </div>

      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Preço (R$)
        </label>
        <input
          name="preco"
          required
          inputMode="decimal"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          className={campoClasse}
          style={campoEstilo}
        />
      </div>
      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
        O anúncio é criado como Gratuito. Dá para destacar como Premium
        (pago) depois, na página do anúncio.
      </p>

      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Descrição
        </label>
        <textarea name="descricao" rows={4} className={campoClasse} style={campoEstilo} />
      </div>

      {erro && (
        <p className="text-sm" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="px-6 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {salvando ? "Criando…" : "Criar anúncio (rascunho)"}
      </button>
    </form>
  );
}
