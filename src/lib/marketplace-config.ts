// Chave geral do marketplace (vitrine de filhotes, compradores, anúncios,
// mensagens, lista de espera, radar de mercado e precificação).
//
// Decisão do sócio: por enquanto o foco é a GESTÃO DO CANIL. O marketplace
// fica em standby, sem apagar nada: o código e os dados continuam no
// projeto, só ficam escondidos e bloqueados.
//
// Para religar mais tarde: na Vercel, crie NEXT_PUBLIC_MARKETPLACE_ATIVO=true
// e faça um novo deploy. (O prefixo NEXT_PUBLIC_ é necessário para a chave
// valer também nas telas do navegador.)

export const MARKETPLACE_ATIVO = process.env.NEXT_PUBLIC_MARKETPLACE_ATIVO === "true";

/** Páginas que só existem com o marketplace ligado. */
const PAGINAS_DO_MARKETPLACE = [
  "/marketplace",
  "/dashboard/comprador",
  "/dashboard/criador/anuncios",
  "/dashboard/criador/mensagens",
  "/dashboard/criador/mercado",
  "/dashboard/criador/precificacao",
  "/dashboard/criador/desempenho",
  "/dashboard/criador/lista-espera",
];

/** Rotas de API que só funcionam com o marketplace ligado. */
const APIS_DO_MARKETPLACE = [
  "/api/anuncios",
  "/api/desejos",
  "/api/favoritos",
  "/api/eventos",
  "/api/matches",
  "/api/mensagens",
  "/api/reservas",
  "/api/precificacao",
];

function dentroDe(caminho: string, base: string): boolean {
  return caminho === base || caminho.startsWith(`${base}/`);
}

export function ehPaginaDoMarketplace(pathname: string): boolean {
  return PAGINAS_DO_MARKETPLACE.some((b) => dentroDe(pathname, b));
}

export function ehApiDoMarketplace(pathname: string): boolean {
  if (/^\/api\/canis\/[^/]+\/lista-espera$/.test(pathname)) return true;
  return APIS_DO_MARKETPLACE.some((b) => dentroDe(pathname, b));
}
