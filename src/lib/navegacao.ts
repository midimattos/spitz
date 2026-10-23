// Lógica de navegação da barra "Voltar / Painel" (src/components/barra-navegacao.tsx).
// Fica separada do componente para poder ser testada sem React nem Next.

export type ContextoNavegacao = {
  /** Destino do link fixo (o "painel" da área em que o usuário está). */
  homeHref: string;
  homeLabel: string;
  /** Verdadeiro na própria página inicial da área — ali a barra não aparece. */
  ehHome: boolean;
};

function normalizar(pathname: string): string {
  const semQuery = pathname.split("?")[0].split("#")[0];
  if (semQuery.length <= 1) return "/";
  return semQuery.replace(/\/+$/, "") || "/";
}

function dentroDe(caminho: string, base: string): boolean {
  return caminho === base || caminho.startsWith(`${base}/`);
}

export function resolverContexto(pathname: string): ContextoNavegacao {
  const p = normalizar(pathname);

  if (dentroDe(p, "/dashboard/comprador")) {
    return { homeHref: "/dashboard/comprador", homeLabel: "Painel do comprador", ehHome: p === "/dashboard/comprador" };
  }
  if (dentroDe(p, "/dashboard")) {
    return { homeHref: "/dashboard/criador", homeLabel: "Painel do criador", ehHome: p === "/dashboard/criador" };
  }
  if (dentroDe(p, "/admin")) {
    return { homeHref: "/admin", homeLabel: "Administração", ehHome: p === "/admin" };
  }
  if (dentroDe(p, "/canil") || dentroDe(p, "/dossie")) {
    // Páginas públicas de um canil / dossiê: normalmente se chega nelas pela vitrine.
    return { homeHref: "/marketplace", homeLabel: "Marketplace", ehHome: false };
  }
  return { homeHref: "/", homeLabel: "Início", ehHome: p === "/" };
}

/**
 * Página "acima" da atual, usada quando não há histórico para voltar
 * (por exemplo, quando o link foi aberto direto numa aba nova). Nunca sobe
 * além do painel da área e nunca aponta para uma rota que não tem página.
 */
export function paiDaRota(pathname: string, homeHref: string): string {
  const partes = normalizar(pathname).split("/").filter(Boolean);
  partes.pop();
  const candidato = partes.length > 0 ? `/${partes.join("/")}` : "/";

  if (homeHref === "/") return candidato;
  return dentroDe(candidato, homeHref) ? candidato : homeHref;
}
