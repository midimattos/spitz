import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { calcularComissaoVenda } from "@/lib/precos-plataforma";

const anuncioUpdateSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional(),
  preco: z.number().positive().optional(),
  // "PREMIUM" só é setado pelo webhook de pagamento (ver
  // /api/pagamentos/anuncio-premium) — por aqui só dá para voltar a
  // GRATUITO, nunca virar PREMIUM sem pagar.
  tipo: z.enum(["GRATUITO"]).optional(),
  status: z.enum(["RASCUNHO", "PUBLICADO", "PAUSADO", "VENDIDO"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existente = await prisma.anuncio.findFirst({ where: { id, canilId: canil.id } });
  if (!existente) return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = anuncioUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const anuncio = await prisma.anuncio.update({ where: { id }, data: parsed.data });

  // Ao marcar como vendido pela primeira vez, gera a cobrança da comissão
  // da plataforma sobre o preço do anúncio (ainda pendente de pagamento).
  const passouAVendido = parsed.data.status === "VENDIDO" && existente.status !== "VENDIDO";
  if (passouAVendido) {
    const jaTemComissao = await prisma.pagamento.findFirst({
      where: { anuncioId: id, tipo: "COMISSAO_VENDA" },
    });
    if (!jaTemComissao) {
      await prisma.pagamento.create({
        data: {
          canilId: canil.id,
          anuncioId: id,
          tipo: "COMISSAO_VENDA",
          valor: calcularComissaoVenda(Number(anuncio.preco)),
        },
      });
    }
  }

  return NextResponse.json(anuncio);
}
