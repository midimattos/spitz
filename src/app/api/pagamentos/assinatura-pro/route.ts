import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { criarPreferenciaPagamento, mercadoPagoConfigurado } from "@/lib/mercadopago";
import { cobrancaAtiva, planoPorId, valorDoPlano } from "@/lib/assinatura";
import { asaasConfigurado, criarCheckoutAssinatura, provedorDePagamento, urlDoCheckout } from "@/lib/asaas";
import { auth } from "@/lib/auth";

const corpoSchema = z.object({ plano: z.enum(["MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]) });

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();

  if (!cobrancaAtiva()) {
    return NextResponse.json({ error: "A cobrança ainda não começou. Você será avisado antes." }, { status: 503 });
  }
  if (provedorDePagamento() === "asaas") return await iniciarAsaas(request, canil);
  if (!mercadoPagoConfigurado()) {
    return NextResponse.json(
      { error: "Pagamentos ainda não configurados nesta instância (falta MERCADOPAGO_ACCESS_TOKEN)." },
      { status: 503 }
    );
  }

  const parsed = corpoSchema.safeParse(await request.json().catch(() => null));
  const plano = parsed.success ? planoPorId(parsed.data.plano) : null;
  if (!plano) return NextResponse.json({ error: "Escolha um plano válido." }, { status: 400 });

  const v = valorDoPlano(plano, canil);

  const pagamento = await prisma.pagamento.create({
    data: {
      canilId: canil.id,
      tipo: "ASSINATURA_PRO",
      valor: v.valor,
      valorCheio: v.valorCheio,
      usouDescontoIndicacao: v.usaDesconto,
      meses: plano.meses,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL;

  try {
    const preferencia = await criarPreferenciaPagamento({
      item: { titulo: `Assinatura ${plano.rotulo} — ${canil.nome}`, valor: v.valor },
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

type CanilLogado = NonNullable<Awaited<ReturnType<typeof getCanilDoCriadorLogado>>>;

/** Assinatura recorrente no cartão pelo Asaas: o cliente digita o cartão na tela do Asaas, nunca aqui. */
async function iniciarAsaas(request: Request, canil: CanilLogado) {
  if (!asaasConfigurado()) {
    return NextResponse.json({ error: "Pagamentos ainda não configurados (falta ASAAS_API_KEY)." }, { status: 503 });
  }
  const parsed = corpoSchema.safeParse(await request.json().catch(() => null));
  const plano = parsed.success ? planoPorId(parsed.data.plano) : null;
  if (!plano) return NextResponse.json({ error: "Escolha um plano válido." }, { status: 400 });

  if (canil.asaasSubscriptionId) {
    return NextResponse.json({ error: "Você já tem renovação automática ativa. Cancele-a antes de trocar de plano." }, { status: 409 });
  }

  const session = await auth();
  const baseUrl = process.env.NEXTAUTH_URL;
  // Na cobrança automática o preço é o cheio do plano (o desconto de indicação não se aplica à recorrência).
  const valor = plano.preco;

  const pagamento = await prisma.pagamento.create({
    data: { canilId: canil.id, tipo: "ASSINATURA_PRO", valor, valorCheio: valor, meses: plano.meses },
  });
  try {
    const checkout = await criarCheckoutAssinatura({
      referencia: pagamento.id,
      titulo: `Assinatura ${plano.rotulo}`,
      descricao: `Acesso completo ao sistema — ${plano.rotulo}`,
      valor,
      plano: plano.id,
      nome: session?.user?.name ?? canil.nome,
      email: session?.user?.email ?? "",
      urlSucesso: `${baseUrl}/dashboard/criador/assinatura?pagamento=processando`,
      urlCancelado: `${baseUrl}/dashboard/criador/assinatura?pagamento=falhou`,
      urlExpirado: `${baseUrl}/dashboard/criador/assinatura?pagamento=falhou`,
    });
    await prisma.pagamento.update({ where: { id: pagamento.id }, data: { asaasCheckoutId: checkout.id } });
    return NextResponse.json({ initPoint: urlDoCheckout(checkout.id) });
  } catch (e) {
    console.error("Asaas checkout falhou", e);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento" }, { status: 502 });
  }
}
