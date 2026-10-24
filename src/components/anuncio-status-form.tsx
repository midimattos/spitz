"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Anuncio = { id: string; preco: number; tipo: string; status: string };

const campoEstilo = { borderColor: "var(--border-hairline)" };

// Aceita "5800", "5800.50" e "5.800,50" (formato brasileiro).
function lerValor(texto: string): number {
  const t = texto.trim();
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  return parseFloat(normalizado);
}

export function AnuncioStatusForm({ anuncio }: { anuncio: Anuncio }) {
  const router = useRouter();
  const [status, setStatus] = useState(anuncio.status);
  const [preco, setPreco] = useState(anuncio.preco.toString());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Passos extras: marcar como vendido ou pausar pedem um dado a mais, que
  // alimenta o mercado (preço final real, canal da venda, motivo da pausa).
  const [pendente, setPendente] = useState<"VENDIDO" | "PAUSADO" | null>(null);
  const [precoFinal, setPrecoFinal] = useState(anuncio.preco.toString());
  const [canal, setCanal] = useState("PLATAFORMA_CONTATO");
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState("");
  const [compradorNome, setCompradorNome] = useState("");
  const [compradorEmail, setCompradorEmail] = useState("");
  const [origem, setOrigem] = useState("");
  const [estadoComprador, setEstadoComprador] = useState("");
  const [cidadeComprador, setCidadeComprador] = useState("");

  async function salvar(dados: Record<string, unknown>): Promise<boolean> {
    setSalvando(true);
    setErro(null);

    const res = await fetch(`/api/anuncios/${anuncio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível salvar");
      return false;
    }

    router.refresh();
    return true;
  }

  function aoMudarStatus(novo: string) {
    if (novo === "VENDIDO" || novo === "PAUSADO") {
      setPendente(novo);
      return;
    }
    setPendente(null);
    setStatus(novo);
    salvar({ status: novo });
  }

  async function confirmarPendente() {
    if (pendente === "VENDIDO") {
      const valor = lerValor(precoFinal);
      if (!Number.isFinite(valor) || valor <= 0) {
        setErro("Informe o preço final da venda");
        return;
      }
      const ok = await salvar({
        status: "VENDIDO",
        venda: {
          precoFinal: valor,
          canal,
          dataVenda: dataVenda || undefined,
          ...(compradorNome ? { compradorNome } : {}),
          ...(compradorEmail ? { compradorEmail } : {}),
          ...(origem ? { origemComprador: origem } : {}),
          ...(estadoComprador ? { estadoComprador } : {}),
          ...(cidadeComprador ? { cidadeComprador } : {}),
        },
      });
      if (ok) {
        setStatus("VENDIDO");
        setPendente(null);
      }
    } else if (pendente === "PAUSADO") {
      const ok = await salvar({ status: "PAUSADO", ...(motivo ? { motivo } : {}) });
      if (ok) {
        setStatus("PAUSADO");
        setPendente(null);
      }
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Status
          </label>
          <select
            value={pendente ?? status}
            onChange={(e) => aoMudarStatus(e.target.value)}
            className="px-2 py-1.5 rounded border bg-transparent text-sm"
            style={campoEstilo}
          >
            <option value="RASCUNHO">Rascunho</option>
            <option value="PUBLICADO">Publicado</option>
            <option value="PAUSADO">Pausado</option>
            <option value="VENDIDO">Vendido</option>
          </select>
        </div>

        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Preço anunciado (R$)
          </label>
          <input
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            onBlur={() => {
              const novo = lerValor(preco);
              if (Number.isFinite(novo) && novo > 0 && novo !== anuncio.preco) salvar({ preco: novo });
            }}
            className="px-2 py-1.5 rounded border bg-transparent text-sm w-32"
            style={campoEstilo}
          />
        </div>

        {salvando && <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Salvando…</span>}
        {erro && <span className="text-xs" style={{ color: "#a32d2d" }}>{erro}</span>}
      </div>

      {pendente === "VENDIDO" && (
        <div className="mt-4 p-4 rounded border space-y-3" style={campoEstilo}>
          <p className="text-sm" style={{ color: "var(--pine)" }}>
            <strong>Parabéns pela venda!</strong> Esses dados ajudam o mercado — e a sua próxima
            precificação — a ficarem mais precisos.
          </p>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
                Preço final recebido (R$)
              </label>
              <input
                value={precoFinal}
                onChange={(e) => setPrecoFinal(e.target.value)}
                inputMode="decimal"
                className="px-2 py-1.5 rounded border bg-transparent text-sm w-36"
                style={campoEstilo}
              />
            </div>
            <div>
              <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
                Como foi fechada
              </label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                className="px-2 py-1.5 rounded border bg-transparent text-sm"
                style={campoEstilo}
              >
                <option value="PLATAFORMA_CONTATO">Mensagem no anúncio</option>
                <option value="PLATAFORMA_MATCH">Radar de demanda (match)</option>
                <option value="FORA">Fora da plataforma</option>
              </select>
            </div>
            <div>
              <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
                Data da venda
              </label>
              <input
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                className="px-2 py-1.5 rounded border bg-transparent text-sm"
                style={campoEstilo}
              />
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Dados do comprador (opcionais). Com o e-mail, o comprador recebe o certificado do filhote, o convite para
            avaliar o canil e os lembretes de vacina em nome do seu canil.
          </p>
          <div className="flex flex-wrap gap-3">
            <input value={compradorNome} onChange={(e) => setCompradorNome(e.target.value)} placeholder="Nome do comprador" className="px-2 py-1.5 rounded border bg-transparent text-sm w-48" style={campoEstilo} />
            <input value={compradorEmail} onChange={(e) => setCompradorEmail(e.target.value)} placeholder="E-mail do comprador" type="email" className="px-2 py-1.5 rounded border bg-transparent text-sm w-56" style={campoEstilo} />
            <input value={cidadeComprador} onChange={(e) => setCidadeComprador(e.target.value)} placeholder="Cidade" className="px-2 py-1.5 rounded border bg-transparent text-sm w-36" style={campoEstilo} />
            <input value={estadoComprador} onChange={(e) => setEstadoComprador(e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" className="px-2 py-1.5 rounded border bg-transparent text-sm w-16" style={campoEstilo} />
            <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="px-2 py-1.5 rounded border bg-transparent text-sm" style={campoEstilo}>
              <option value="">Como o comprador chegou?</option>
              <option value="MARKETPLACE">Marketplace da plataforma</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="INDICACAO">Indicação</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmarPendente}
              disabled={salvando}
              className="px-4 py-1.5 rounded text-white text-sm disabled:opacity-60"
              style={{ background: "var(--pine)" }}
            >
              Confirmar venda
            </button>
            <button
              type="button"
              onClick={() => setPendente(null)}
              className="px-4 py-1.5 rounded border text-sm"
              style={campoEstilo}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pendente === "PAUSADO" && (
        <div className="mt-4 p-4 rounded border space-y-3" style={campoEstilo}>
          <div>
            <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
              Por que está pausando? (opcional)
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="px-2 py-1.5 rounded border bg-transparent text-sm"
              style={campoEstilo}
            >
              <option value="">Prefiro não informar</option>
              <option value="PRECO_ALTO">O preço não estava vendendo</option>
              <option value="DESISTI">Desisti de vender</option>
              <option value="OUTRO">Outro motivo</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmarPendente}
              disabled={salvando}
              className="px-4 py-1.5 rounded text-white text-sm disabled:opacity-60"
              style={{ background: "var(--pine)" }}
            >
              Pausar anúncio
            </button>
            <button
              type="button"
              onClick={() => setPendente(null)}
              className="px-4 py-1.5 rounded border text-sm"
              style={campoEstilo}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
