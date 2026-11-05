import { prisma } from "@/lib/prisma";
import { buscarClienteAsaas } from "@/lib/asaas";
import { novoFimDoAcesso, planosDisponiveis } from "@/lib/assinatura";

type PagamentoAsaas = {
  id: string;
  customer?: string;
  subscription?: string | null;
  externalReference?: string | null;
  status?: string;
  value?: number;
};

type EventoAsaas = {
  id?: string;
  event?: string;
  payment?: PagamentoAsaas;
  subscription?: { id?: string; customer?: string; externalReference?: string | null };
  checkout?: { id?: string; externalReference?: string | null };
};

/** Descobre de qual canil é a cobrança: pela referência, pela assinatura, pelo cliente ou, por último, pelo e-mail. */
async function acharCanilId(p: PagamentoAsaas): Promise<string | null> {
  if (p.externalReference) {
    const local = await prisma.pagamento.findUnique({ where: { id: p.externalReference }, select: { canilId: true } });
    if (local) return local.canilId;
  }
  if (p.subscription) {
    const c = await prisma.canil.findFirst({ where: { asaasSubscriptionId: p.subscription }, select: { id: true } });
    if (c) return c.id;
  }
  if (p.customer) {
    const c = await prisma.canil.findFirst({ where: { asaasCustomerId: p.customer }, select: { id: true } });
    if (c) return c.id;
    const cliente = await buscarClienteAsaas(p.customer).catch(() => null);
    const email = cliente?.email?.trim().toLowerCase();
    if (email) {
      const u = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, role: "CRIADOR" },
        select: { canil: { select: { id: true } } },
      });
      if (u?.canil) return u.canil.id;
    }
  }
  return null;
}

function mesesDoValor(valor: number | undefined): number | null {
  if (valor === undefined) return null;
  const plano = planosDisponiveis().find((pl) => Math.abs(pl.preco - valor) < 0.01);
  return plano ? plano.meses : null;
}

/** Aplica um evento do Asaas. Devolve false quando o evento deve ser reenviado depois. */
export async function processarEventoAsaas(ev: EventoAsaas): Promise<boolean> {
  const tipo = ev.event ?? "";
  const p = ev.payment;

  if ((tipo === "PAYMENT_CONFIRMED" || tipo === "PAYMENT_RECEIVED") && p?.id) {
    // O cartão gera CONFIRMED agora e RECEIVED ~32 dias depois: o acesso só é estendido uma vez por cobrança.
    const jaAplicado = await prisma.pagamento.findUnique({ where: { asaasPaymentId: p.id }, select: { id: true } });
    if (jaAplicado) return true;

    const canilId = await acharCanilId(p);
    if (!canilId) {
      console.error("Asaas: cobrança sem canil identificado", p.id);
      return false; // pede reenvio; o suporte pode ajustar e o Asaas tenta de novo
    }

    const canil = await prisma.canil.findUnique({
      where: { id: canilId },
      select: { proGratisAte: true, planoMeses: true },
    });
    const local = p.externalReference
      ? await prisma.pagamento.findUnique({ where: { id: p.externalReference }, select: { id: true, meses: true } })
      : null;
    const meses = local?.meses ?? mesesDoValor(p.value) ?? canil?.planoMeses ?? 1;

    const fim = novoFimDoAcesso(canil?.proGratisAte ?? null, meses);
    const dadosPagamento = {
      status: "APROVADO" as const,
      asaasPaymentId: p.id,
      meses,
    };
    if (local) {
      await prisma.pagamento.update({ where: { id: local.id }, data: dadosPagamento });
    } else {
      await prisma.pagamento.create({
        data: { canilId, tipo: "ASSINATURA_PRO", valor: p.value ?? 0, ...dadosPagamento },
      });
    }
    await prisma.canil.update({
      where: { id: canilId },
      data: {
        proGratisAte: fim,
        planoMeses: meses,
        ...(p.customer ? { asaasCustomerId: p.customer } : {}),
        ...(p.subscription ? { asaasSubscriptionId: p.subscription } : {}),
      },
    });
    return true;
  }

  if ((tipo === "PAYMENT_REFUNDED" || tipo === "PAYMENT_CHARGEBACK_REQUESTED") && p?.id) {
    // Estorno: marca o pagamento; o acesso já concedido é tratado à mão pelo admin.
    await prisma.pagamento.updateMany({ where: { asaasPaymentId: p.id }, data: { status: "CANCELADO" } });
    return true;
  }

  if ((tipo === "SUBSCRIPTION_DELETED" || tipo === "SUBSCRIPTION_INACTIVATED") && ev.subscription?.id) {
    // Renovação automática encerrada; o acesso continua até o fim do período já pago.
    await prisma.canil.updateMany({ where: { asaasSubscriptionId: ev.subscription.id }, data: { asaasSubscriptionId: null } });
    return true;
  }

  return true; // outros eventos: só confirmar
}
