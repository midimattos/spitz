import { aprovarDesejoSeContatoOk } from "@/lib/whatsapp";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/notificacoes";

const identificador = (userId: string) => `email:${userId}`;

/** Gera um link de confirmação (válido por 48 h) e envia por e-mail. */
export async function enviarConfirmacaoEmail(user: { id: string; email: string; name: string }) {
  const id = identificador(user.id);
  await prisma.verificationToken.deleteMany({ where: { identifier: id } });
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: id,
      token: createHash("sha256").update(token).digest("hex"),
      expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });
  await enviarEmail(
    user.email,
    "Confirme seu e-mail",
    `Olá, ${user.name.split(" ")[0]}! Falta só confirmar seu e-mail para liberar todos os recursos da plataforma. O link vale por 48 horas.`,
    `/confirmar-email/${token}`
  );
}

/** Consome o token e marca o e-mail como confirmado. Retorna true se deu certo. */
export async function confirmarEmailComToken(token: string): Promise<boolean> {
  const hash = createHash("sha256").update(token).digest("hex");
  const registro = await prisma.verificationToken.findUnique({ where: { token: hash } });
  if (!registro || !registro.identifier.startsWith("email:") || registro.expires < new Date()) return false;
  const userId = registro.identifier.slice("email:".length);
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  await aprovarDesejoSeContatoOk(userId).catch(() => null);
  await prisma.verificationToken.deleteMany({ where: { identifier: registro.identifier } });
  return true;
}
