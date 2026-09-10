import type { NextAuthConfig } from "next-auth";

// Configuração compatível com o Edge Runtime (usada pelo middleware.ts).
// NÃO importe Prisma, bcrypt ou qualquer coisa Node-only aqui — o Edge
// Runtime não suporta essas bibliotecas, e isso é exatamente o que causava
// falha no build: o middleware importava @/lib/auth inteiro (com Prisma
// junto) só pra checar o papel do usuário no token JWT, o que nem precisa
// de banco de dados.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [], // Providers reais (com Prisma) só existem em src/lib/auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "CRIADOR" | "COMPRADOR";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
