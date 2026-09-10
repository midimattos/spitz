import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { criarPreferenciaPagamento, mercadoPagoConfigurado } from "@/lib/mercadopago";
import { PRECO_ASSINATURA_PRO_MENSAL } from "@/lib/precos-plataforma";

export async function POST() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!mercadoPagoConfigurado()) {
    return NextResponse.json(
      { error: "Pagamentos ainda não configurados nesta instância (falta MERCADOPAGO_ACCESS_TOKEN)." },
      { status: 503 }
    );
  }

  const pagamento = await prisma.pagamento.create({
    data: {
      canilId: canil.id,
      tipo: "ASSINATURA_PRO",
      valor: PRECO_ASSINATURA_PRO_MENSAL,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL;

  try {
    const preferencia = await criarPreferenciaPagamento({
      item: { titulo: "Assinatura PRO — Inteligência de Mercado (mensal)", valor: PRECO_ASSINATURA_PRO_MENSAL },
      referenciaExterna: pagamento.id,
      urlRetornoSucesso: `${baseUrl}/dashboard/criador/mercado?pagamento=processando`,
      urlRetornoFalha: `${baseUrl}/dashboard/criador/mercado?pagamento=falhou`,
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
