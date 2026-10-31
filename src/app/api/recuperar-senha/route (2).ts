import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/notificacoes";
import { verificarLimite, ipDe } from "@/lib/limite-taxa";

const schema = z.object({ email: z.string().email() });

// Resposta sempre igual, exista a conta ou não (não revela quem tem cadastro).
const OK = NextResponse.json({ ok: true });

export async function POST(request: Request) {
  const lim = await verificarLimite(`recuperar:ip:${ipDe(request.headers)}`, 6, 60 * 60);
  if (!lim.ok) return OK;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return OK;
  const email = parsed.data.email.trim().toLowerCase();

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user || !user.passwordHash) return OK;

  const identifier = `reset:${user.id}`;

  // Limite: um pedido por minuto por conta.
  const recente = await prisma.verificationToken.findFirst({
    where: { identifier, expires: { gt: new Date(Date.now() + 59 * 60 * 1000) } },
  });
  if (recente) return OK;

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  await prisma.verificationToken.create({
    data: { identifier, token: hash, expires: new Date(Date.now() + 60 * 60 * 1000) },
  });

  await enviarEmail(
    user.email,
    "Redefinir sua senha",
    "Recebemos um pedido para redefinir a senha da sua conta. O link vale por 1 hora. Se não foi você, ignore este e-mail: nada será alterado.",
    `/redefinir-senha/${token}`
  );

  return OK;
}
