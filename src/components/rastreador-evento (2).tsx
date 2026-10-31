"use client";

import { useEffect } from "react";

type Filtros = {
  porte?: string;
  sexo?: string;
  precoMin?: number;
  precoMax?: number;
  corBase?: string;
  marcacao?: string;
  diluicao?: string;
  merle?: string;
  estado?: string;
  cidade?: string;
};

type Props =
  | { tipo: "VISUALIZACAO_ANUNCIO"; anuncioId: string }
  | { tipo: "VISUALIZACAO_CANIL"; canilSlug: string }
  | { tipo: "BUSCA"; filtros: Filtros };

// Identificador anônimo do navegador (sem dado pessoal) para não contar a
// mesma pessoa várias vezes. Se o navegador bloquear o armazenamento, o
// evento é enviado sem identificador e o servidor ainda deduplica por usuário
// logado quando houver.
function obterVisitante(): string | undefined {
  try {
    const chave = "spitz_visitante";
    let id = window.localStorage.getItem(chave);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, "");
      window.localStorage.setItem(chave, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/** Classifica de onde o visitante veio (utm_source ou site de origem), sem guardar o endereço. */
function detectarOrigem(): "instagram" | "whatsapp" | "google" | "facebook" | "direto" | "outro" {
  type O = "instagram" | "whatsapp" | "google" | "facebook" | "direto" | "outro";
  try {
    // A origem vale para a sessão inteira: guarda a da primeira página aberta.
    const guardada = window.sessionStorage.getItem("spitz_origem") as O | null;
    if (guardada) return guardada;

    const utm = new URLSearchParams(window.location.search).get("utm_source")?.toLowerCase() ?? "";
    const ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
    const alvo = `${utm} ${ref}`;
    let origem: O = "outro";
    if (/instagram|\big\b/.test(alvo)) origem = "instagram";
    else if (/whatsapp|wa\.me/.test(alvo)) origem = "whatsapp";
    else if (/google/.test(alvo)) origem = "google";
    else if (/facebook|fb\.|meta/.test(alvo)) origem = "facebook";
    else if (!utm && (!ref || ref === window.location.hostname)) origem = "direto";
    window.sessionStorage.setItem("spitz_origem", origem);
    return origem;
  } catch {
    return "direto";
  }
}

/**
 * Componente invisível: registra uma visualização ou busca no marketplace.
 * Roda no navegador (e não no servidor) de propósito: assim robôs e
 * pré-carregamentos de link não inflam os números de interesse.
 */
export function RastreadorEvento(props: Props) {
  const chave = JSON.stringify(props);

  useEffect(() => {
    const visitante = obterVisitante();
    fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...JSON.parse(chave), visitante, origem: detectarOrigem() }),
      keepalive: true,
    }).catch(() => {
      /* coleta de métrica nunca deve atrapalhar a página */
    });
  }, [chave]);

  return null;
}
