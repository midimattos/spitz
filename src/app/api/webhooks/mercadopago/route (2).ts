import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarPagamentoMP, validarAssinaturaWebhook } from "@/lib/mercadopago";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const dataId: string | undefined = body?.data?.id;
  const tipoEvento: string | undefined = body?.type;

  // Só nos interessam notificações de pagamento — outras (merchant_order
  // etc.) são apenas confirmadas para o Mercado Pago parar de reenviar.
  if (tipoEvento !== "payment" || !dataId) {
    return NextResponse.json({ ok: true });
  }

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  // Se o segredo do webhook estiver configurado, a assinatura PRECISA
  // bater — do contrário, qualquer um poderia forjar uma notificação de
  // "pagamento aprovado" e ganhar acesso PRO de graça. Sem o segredo
  // configurado (ambiente de teste), seguimos sem validar e avisamos no
  // log — não é seguro para produção, só é aceitável antes de configurar.
  if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    const assinaturaValida = validarAssinaturaWebhook(xSignature, xRequestId, dataId);
    if (!assinaturaValida) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  } else {
    console.warn(
      "MERCADOPAGO_WEBHOOK_SECRET não configurado — webhook aceito sem validar assinatura."
    );
  }

  let pagamentoMP;
  try {
    pagamentoMP = await buscarPagamentoMP(dataId);
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar o pagamento" }, { status: 502 });
  }

  const pagamentoId = pagamentoMP.external_reference;
  if (!pagamentoId) return NextResponse.json({ ok: true });

  const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamentoId } });
  if (!pagamento) return NextResponse.json({ ok: true });

  const novoStatus =
    pagamentoMP.status === "approved"
      ? "APROVADO"
      : pagamentoMP.status === "rejected" || pagamentoMP.status === "cancelled"
        ? "REJEITADO"
        : "PENDENTE";

  const eraAprovadoAntes = pagamento.status === "APROVADO";

  await prisma.pagamento.update({
    where: { id: pagamento.id },
    data: { status: novoStatus, mercadoPagoPaymentId: String(pagamentoMP.id) },
  });

  // Aplica o benefício só na transição para APROVADO, para não repetir o
  // efeito se o Mercado Pago reenviar a mesma notificação (o que é comum).
  if (novoStatus === "APROVADO" && !eraAprovadoAntes) {
    if (pagamento.tipo === "ASSINATURA_PRO") {
      await prisma.canil.update({ where: { id: pagamento.canilId }, data: { assinaturaPro: true } });
    }
    if (pagamento.tipo === "ANUNCIO_PREMIUM" && pagamento.anuncioId) {
      await prisma.anuncio.update({ where: { id: pagamento.anuncioId }, data: { tipo: "PREMIUM" } });
    }
    // COMISSAO_VENDA não precisa de efeito adicional além de ficar marcada como paga.
  }

  return NextResponse.json({ ok: true });
}
