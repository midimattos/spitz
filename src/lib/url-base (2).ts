import { headers } from "next/headers";

/** Endereço público do site (para links em e-mails, QR codes e cartazes). */
export async function urlBase(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    /* fora de uma requisição */
  }
  return "";
}

/** Versão para rotas de API, que já têm o objeto Request. */
export function urlBaseDaRequisicao(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  return (env ?? new URL(request.url).origin).replace(/\/$/, "");
}
