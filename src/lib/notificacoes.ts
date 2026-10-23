import { prisma } from "@/lib/prisma";
import type { TipoNotificacao } from "@prisma/client";

// Avisos internos (sino do painel) + e-mail opcional.
//
// O e-mail só é enviado se RESEND_API_KEY estiver configurada (plano grátis
// do Resend serve para começar) e só para os avisos que realmente merecem
// tirar a pessoa do que está fazendo. Sem a chave, tudo continua funcionando
// pelo sino dentro da plataforma.

const TIPOS_COM_EMAIL: TipoNotificacao[] = [
  "MENSAGEM_NOVA",
  "MATCH_NOVO",
  "MATCH_ACEITO",
  "COMPRADOR_APROVADO",
  "CANIL_VERIFICADO",
];

async function enviarEmail(para: string, assunto: string, texto: string, link?: string | null) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return;

  const remetente = process.env.EMAIL_REMETENTE ?? "Plataforma Spitz <onboarding@resend.dev>";
  const base = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
  const corpo = link && base ? `${texto}\n\nAbrir: ${base}${link}` : texto;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remetente, to: [para], subject: assunto, text: corpo }),
    });
  } catch (erro) {
    console.error("[notificacoes] falha ao enviar e-mail", erro);
  }
}

export async function notificar(args: {
  userId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link?: string;
  /** Chave única: o mesmo aviso automático não é criado duas vezes para o mesmo usuário. */
  chave?: string;
}): Promise<boolean> {
  try {
    if (args.chave) {
      const existente = await prisma.notificacao.findUnique({
        where: { userId_chave: { userId: args.userId, chave: args.chave } },
        select: { id: true },
      });
      if (existente) return false;
    }

    await prisma.notificacao.create({
      data: {
        userId: args.userId,
        tipo: args.tipo,
        titulo: args.titulo,
        mensagem: args.mensagem,
        link: args.link ?? null,
        chave: args.chave ?? null,
      },
    });

    if (TIPOS_COM_EMAIL.includes(args.tipo)) {
      const usuario = await prisma.user.findUnique({ where: { id: args.userId }, select: { email: true } });
      if (usuario?.email) await enviarEmail(usuario.email, args.titulo, args.mensagem, args.link);
    }
    return true;
  } catch (erro) {
    // corrida entre duas execuções (chave única) ou banco indisponível: não quebra o fluxo
    console.error("[notificacoes] falha ao criar aviso", erro);
    return false;
  }
}
