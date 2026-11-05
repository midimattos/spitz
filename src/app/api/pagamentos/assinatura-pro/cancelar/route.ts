import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { asaasConfigurado, cancelarAssinaturaAsaas } from "@/lib/asaas";

/** Encerra a renovação automática. O acesso continua até o fim do período já pago. */
export async function POST() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  if (!canil.asaasSubscriptionId) {
    return NextResponse.json({ error: "Não há renovação automática ativa." }, { status: 400 });
  }
  if (!asaasConfigurado()) {
    return NextResponse.json({ error: "Pagamentos ainda não configurados." }, { status: 503 });
  }
  try {
    await cancelarAssinaturaAsaas(canil.asaasSubscriptionId);
  } catch {
    return NextResponse.json({ error: "Não foi possível cancelar agora. Tente de novo em instantes." }, { status: 502 });
  }
  await prisma.canil.update({ where: { id: canil.id }, data: { asaasSubscriptionId: null } });
  return NextResponse.json({ ok: true });
}
