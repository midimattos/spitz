import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { criarPreferenciaPagamento, mercadoPagoConfigurado } from "@/lib/mercadopago";
import { precoCheioMensal, situacaoAssinatura } from "@/lib/assinatura";

export async function POST() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!mercadoPagoConfigurado()) {
    return NextResponse.json(
      { error: "Pagamentos ainda não configurados nesta instância (falta MERCADOPAGO_ACCESS_TOKEN)." },
      { status: 503 }
    );
  }
  if (precoCheioMensal() === null) {
    return NextResponse.json({ error: "A cobrança ainda não começou: o valor da assinatura não foi definido." }, { status: 503 });
  }

  const sit = situacaoAssinatura(canil);
  if (sit.valor === null || sit.preco === null) return NextResponse.json({ error: "Valor indisponível." }, { status: 503 });

  const pagamento = await prisma.pagamento.create({
    data: {
      canilId: canil.id,
      tipo: "ASSINATURA_PRO",
      valor: sit.valor,
      valorCheio: sit.preco,
      usouDescontoIndicacao: sit.usaDesconto,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL;

  try {
    const preferencia = await criarPreferenciaPagamento({
      item: { titulo: "Assinatura mensal — Plataforma Spitz Alemão", valor: sit.valor },
      referenciaExterna: pagamento.id,
      urlRetornoSucesso: `${baseUrl}/dashboard/criador/assinatura?pagamento=processando`,
      urlRetornoFalha: `${baseUrl}/dashboard/criador/assinatura?pagamento=falhou`,
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
