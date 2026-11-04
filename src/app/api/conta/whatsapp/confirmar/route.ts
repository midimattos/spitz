import { aprovarDesejoSeContatoOk } from "@/lib/whatsapp";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verificarLimite, mensagemLimite } from "@/lib/limite-taxa";
import { hashDoCodigo, identificadorWhatsapp } from "@/lib/whatsapp";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const userId = session.user.id;

  const lim = await verificarLimite(`wpp-confirmar:${userId}`, 6, 15 * 60);
  if (!lim.ok) return NextResponse.json({ error: mensagemLimite(lim) }, { status: 429 });

  const parsed = z.object({ codigo: z.string().regex(/^\d{6}$/, "O código tem 6 números") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Código inválido" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { whatsappPendente: true } });
  if (!user?.whatsappPendente) return NextResponse.json({ error: "Informe o número primeiro." }, { status: 400 });

  const registro = await prisma.verificationToken.findFirst({ where: { identifier: identificadorWhatsapp(userId) } });
  if (!registro || registro.expires < new Date()) {
    return NextResponse.json({ error: "Código expirado. Peça um novo." }, { status: 400 });
  }
  if (registro.token !== hashDoCodigo(userId, user.whatsappPendente, parsed.data.codigo)) {
    return NextResponse.json({ error: "Código incorreto." }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { whatsapp: user.whatsappPendente, whatsappVerificadoEm: new Date(), whatsappPendente: null },
    });
  } catch {
    return NextResponse.json({ error: "Este número já está vinculado a outra conta." }, { status: 409 });
  }
  await prisma.verificationToken.deleteMany({ where: { identifier: identificadorWhatsapp(userId) } });
  await aprovarDesejoSeContatoOk(userId).catch(() => null);
  return NextResponse.json({ ok: true });
}
