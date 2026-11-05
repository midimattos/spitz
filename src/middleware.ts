import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { MARKETPLACE_ATIVO, ehApiDoMarketplace, ehPaginaDoMarketplace } from "@/lib/marketplace-config";

// Importante: usamos aqui uma instância do NextAuth criada só com
// authConfig (sem PrismaAdapter, sem Credentials/bcrypt), porque o
// middleware roda no Edge Runtime — que não suporta Prisma nem bcrypt.
// Isso é suficiente pro middleware, já que ele só precisa ler o papel
// (role) já decodificado do token JWT, não fazer nenhuma consulta ao
// banco de dados.
const { auth } = NextAuth(authConfig);

// Regras de acesso por prefixo de rota.
// Ordem importa: a primeira correspondência é usada.
const REGRAS_DE_ACESSO: { prefixo: string; papeisPermitidos: string[] }[] = [
  { prefixo: "/admin", papeisPermitidos: ["ADMIN"] },
  { prefixo: "/dashboard/criador", papeisPermitidos: ["CRIADOR", "ADMIN"] },
  { prefixo: "/dashboard/comprador", papeisPermitidos: ["COMPRADOR", "ADMIN"] },
];

export default auth((req) => {
  const { nextUrl } = req;
  const usuario = req.auth?.user;

  // Marketplace em standby: bloqueia as páginas e as APIs de venda.
  if (!MARKETPLACE_ATIVO) {
    if (ehApiDoMarketplace(nextUrl.pathname)) {
      return NextResponse.json({ error: "O marketplace está em pausa por enquanto." }, { status: 503 });
    }
    if (ehPaginaDoMarketplace(nextUrl.pathname)) {
      const destino = usuario ? (usuario.role === "ADMIN" ? "/admin" : "/dashboard/criador") : "/";
      return NextResponse.redirect(new URL(destino, nextUrl.origin));
    }
  }

  // Repassa o método e o caminho aos handlers (sobrescrevendo o que o navegador mandar):
  // é por eles que o sistema sabe se o pedido altera dados, para bloquear a edição de quem não assinou.
  const repassar = new Headers(req.headers);
  repassar.set("x-metodo", req.method);
  repassar.set("x-caminho", nextUrl.pathname);

  const regra = REGRAS_DE_ACESSO.find((r) => nextUrl.pathname.startsWith(r.prefixo));
  if (!regra) return NextResponse.next({ request: { headers: repassar } });

  if (!usuario) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!regra.papeisPermitidos.includes(usuario.role)) {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return NextResponse.next({ request: { headers: repassar } });
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/marketplace/:path*", "/marketplace", "/api/:path*"],
};
