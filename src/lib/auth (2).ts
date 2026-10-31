import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { verificarLimite, ipDe } from "@/lib/limite-taxa";

class LimiteExcedido extends CredentialsSignin {
  code = "limite";
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { password } = parsed.data;
        const email = parsed.data.email.trim().toLowerCase();

        // Proteção contra tentativas em massa: por e-mail e por endereço de rede.
        const ip = request?.headers ? ipDe(request.headers) : "desconhecido";
        const [porEmail, porIp] = await Promise.all([
          verificarLimite(`login:email:${email}`, 8, 15 * 60),
          verificarLimite(`login:ip:${ip}`, 40, 15 * 60),
        ]);
        if (!porEmail.ok || !porIp.ok) throw new LimiteExcedido();

        // Aceita e-mails antigos cadastrados com maiúsculas.
        const user =
          (await prisma.user.findUnique({ where: { email } })) ??
          (await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } }));
        if (!user || !user.passwordHash) return null;

        const senhaValida = await bcrypt.compare(password, user.passwordHash);
        if (!senhaValida) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  // callbacks.jwt e callbacks.session já vêm de authConfig (auth.config.ts)
  // e se aplicam aqui também — não precisam ser repetidos.
});
