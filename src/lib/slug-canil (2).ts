// Endereço público do canil: spitz.com/nome-do-canil

const RESERVADOS = new Set([
  "login", "register", "admin", "dashboard", "marketplace", "canil", "dossie", "termos", "privacidade",
  "api", "album", "certificado", "avaliar", "c", "sobre", "contato", "ajuda", "planos", "precos",
  "_next", "static", "public", "favicon", "robots", "sitemap", "www", "app", "suporte", "spitz",
]);

export function normalizarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
}

/** Retorna a mensagem de erro, ou null se o endereço é válido. */
export function validarSlug(slug: string): string | null {
  if (slug.length < 3) return "O endereço precisa ter pelo menos 3 letras.";
  if (slug.length > 40) return "O endereço pode ter no máximo 40 caracteres.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return "Use apenas letras minúsculas, números e hífen.";
  if (RESERVADOS.has(slug)) return "Este endereço é reservado. Escolha outro.";
  return null;
}
