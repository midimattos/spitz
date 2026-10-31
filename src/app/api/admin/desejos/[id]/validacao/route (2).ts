import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notificar } from "@/lib/notificacoes";

const schema = z.object({
  validacao: z.enum(["APROVADO", "REJEITADO", "PENDENTE"]),
  nota: z.string().max(300).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const desejo = await prisma.desejoComprador.update({
    where: { id },
    data: {
      validacao: parsed.data.validacao,
      validadoEm: parsed.data.validacao === "PENDENTE" ? null : new Date(),
      validacaoNota: parsed.data.nota ?? null,
    },
  });

  if (parsed.data.validacao === "APROVADO") {
    await notificar({
      userId: desejo.userId,
      tipo: "COMPRADOR_APROVADO",
      titulo: "Seu perfil de comprador foi aprovado",
      mensagem: "Agora os criadores podem aceitar o seu interesse e liberar o contato.",
      link: "/dashboard/comprador/radar",
      chave: `comprador-aprovado:${desejo.id}`,
    });
  }

  return NextResponse.json(desejo);
}
