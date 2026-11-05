import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { acessoLiberado, MENSAGEM_ACESSO_EXPIRADO } from "@/lib/assinatura";

/** Rotas em que o canil pode agir mesmo com o acesso vencido (é por elas que ele assina). */
const ROTAS_LIVRES = ["/api/pagamentos"];

/**
 * Retorna o canil do criador logado, ou null se não houver sessão
 * autenticada com papel CRIADOR ou se, por algum motivo, o canil
 * ainda não existir.
 *
 * Depois que o período de acesso termina, o canil continua enxergando tudo
 * (páginas e consultas), mas qualquer pedido que ALTERA dados (POST, PUT, PATCH,
 * DELETE) volta como null, até a assinatura ser paga.
 */
export async function getCanilDoCriadorLogado() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CRIADOR") return null;

  const canil = await prisma.canil.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!canil) return null;

  // O middleware grava o método e o caminho do pedido (e sobrescreve o que o navegador mandar).
  const h = await headers();
  const metodo = (h.get("x-metodo") ?? "GET").toUpperCase();
  const caminho = h.get("x-caminho") ?? "";
  const altera = metodo !== "GET" && metodo !== "HEAD" && metodo !== "OPTIONS";
  if (altera && !ROTAS_LIVRES.some((r) => caminho === r || caminho.startsWith(`${r}/`)) && !acessoLiberado(canil)) {
    return null;
  }

  return canil;
}

/**
 * Resposta das rotas quando getCanilDoCriadorLogado() devolve null:
 * 402 com a explicação se o motivo foi o acesso vencido; 401 nos demais casos.
 */
export async function respostaSemAcesso(): Promise<NextResponse> {
  const session = await auth();
  if (session?.user?.role === "CRIADOR") {
    const canil = await prisma.canil.findUnique({ where: { ownerId: session.user.id } });
    if (canil && !acessoLiberado(canil)) {
      return NextResponse.json({ error: MENSAGEM_ACESSO_EXPIRADO, codigo: "ACESSO_EXPIRADO" }, { status: 402 });
    }
  }
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}
