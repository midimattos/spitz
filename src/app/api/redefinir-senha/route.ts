import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string().min(20),
  senha: z.string().min(8, "A senha precisa ter no mínimo 8 caracteres"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const hash = createHash("sha256").update(parsed.data.token).digest("hex");
  const registro = await prisma.verificationToken.findUnique({ where: { token: hash } });

  if (!registro || !registro.identifier.startsWith("reset:") || registro.expires < new Date()) {
    return NextResponse.json({ error: "Link inválido ou expirado. Peça um novo." }, { status: 400 });
  }

  const userId = registro.identifier.slice("reset:".length);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(parsed.data.senha, 10) } });
  await prisma.verificationToken.deleteMany({ where: { identifier: registro.identifier } });

  return NextResponse.json({ ok: true });
}
