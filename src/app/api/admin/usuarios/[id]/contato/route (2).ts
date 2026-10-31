import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Confirmação manual feita pela equipe (útil enquanto o envio automático de
// código por WhatsApp não estiver configurado).
const schema = z.object({ campo: z.enum(["email", "whatsapp"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (parsed.data.campo === "email") {
    await prisma.user.update({ where: { id }, data: { emailVerified: new Date() } });
  } else {
    if (!user.whatsappPendente) return NextResponse.json({ error: "O usuário ainda não informou o número." }, { status: 400 });
    try {
      await prisma.user.update({
        where: { id },
        data: { whatsapp: user.whatsappPendente, whatsappVerificadoEm: new Date(), whatsappPendente: null },
      });
    } catch {
      return NextResponse.json({ error: "Esse número já está em outra conta." }, { status: 409 });
    }
  }
  return NextResponse.json({ ok: true });
}
