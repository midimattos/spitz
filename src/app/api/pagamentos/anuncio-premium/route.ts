import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { criarPreferenciaPagamento, mercadoPagoConfigurado } from "@/lib/mercadopago";
import { PRECO_ANUNCIO_PREMIUM } from "@/lib/precos-plataforma";

const schema = z.object({ anuncioId: z.string().min(1) });

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!mercadoPagoConfigurado()) {
    return NextResponse.json(
      { error: "Pagamentos ainda não configurados nesta instância (falta MERCADOPAGO_ACCESS_TOKEN)." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const anuncio = await prisma.anuncio.findFirst({
    where: { id: parsed.data.anuncioId, canilId: canil.id },
  });
  if (!anuncio) return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });

  const pagamento = await prisma.pagamento.create({
    data: {
      canilId: canil.id,
      anuncioId: anuncio.id,
      tipo: "ANUNCIO_PREMIUM",
      valor: PRECO_ANUNCIO_PREMIUM,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL;

  try {
    const preferencia = await criarPreferenciaPagamento({
      item: { titulo: `Destaque Premium — anúncio "${anuncio.titulo}"`, valor: PRECO_ANUNCIO_PREMIUM },
      referenciaExterna: pagamento.id,
      urlRetornoSucesso: `${baseUrl}/dashboard/criador/anuncios/${anuncio.id}?pagamento=processando`,
      urlRetornoFalha: `${baseUrl}/dashboard/criador/anuncios/${anuncio.id}?pagamento=falhou`,
    });

    await prisma.pagamento.update({
      where: { id: pagamento.id },
      data: { mercadoPagoPreferenceId: preferencia.id },
    });

    return NextResponse.json({ initPoint: preferencia.init_point });
  } catch {
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento" }, { status: 502 });
  }
}
