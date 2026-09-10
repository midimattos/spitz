import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { criarPreferenciaPagamento, mercadoPagoConfigurado } from "@/lib/mercadopago";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!mercadoPagoConfigurado()) {
    return NextResponse.json(
      { error: "Pagamentos ainda não configurados nesta instância (falta MERCADOPAGO_ACCESS_TOKEN)." },
      { status: 503 }
    );
  }

  const { id: pagamentoId } = await params;
  const pagamento = await prisma.pagamento.findFirst({
    where: { id: pagamentoId, canilId: canil.id, tipo: "COMISSAO_VENDA", status: "PENDENTE" },
    include: { anuncio: true },
  });
  if (!pagamento) return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL;

  try {
    const preferencia = await criarPreferenciaPagamento({
      item: {
        titulo: `Comissão de venda — anúncio "${pagamento.anuncio?.titulo ?? ""}"`,
        valor: Number(pagamento.valor),
      },
      referenciaExterna: pagamento.id,
      urlRetornoSucesso: `${baseUrl}/dashboard/criador/anuncios/${pagamento.anuncioId}?pagamento=processando`,
      urlRetornoFalha: `${baseUrl}/dashboard/criador/anuncios/${pagamento.anuncioId}?pagamento=falhou`,
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
