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
      body: JSON.stringify({ ...JSON.parse(chave), visitante }),
      keepalive: true,
    }).catch(() => {
      /* coleta de métrica nunca deve atrapalhar a página */
    });
  }, [chave]);

  return null;
}
