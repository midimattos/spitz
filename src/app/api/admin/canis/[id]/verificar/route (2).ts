import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notificar } from "@/lib/notificacoes";

const schema = z.object({ verificado: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const canil = await prisma.canil.update({
    where: { id },
    data: { verificado: parsed.data.verificado },
  });

  if (parsed.data.verificado) {
    await notificar({
      userId: canil.ownerId,
      tipo: "CANIL_VERIFICADO",
      titulo: "Seu canil foi verificado",
      mensagem: "Seus anúncios publicados já aparecem no marketplace.",
      link: "/dashboard/criador/anuncios",
      chave: `canil-verificado:${canil.id}`,
    });
  }

  return NextResponse.json(canil);
}
