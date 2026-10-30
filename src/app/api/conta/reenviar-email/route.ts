import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verificarLimite, mensagemLimite } from "@/lib/limite-taxa";
import { enviarConfirmacaoEmail } from "@/lib/confirmacao-email";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const lim = await verificarLimite(`reenviar-email:${session.user.id}`, 3, 60 * 60);
  if (!lim.ok) return NextResponse.json({ error: mensagemLimite(lim) }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true, jaConfirmado: true });
  await enviarConfirmacaoEmail({ id: user.id, email: user.email, name: user.name });
  return NextResponse.json({ ok: true });
}
