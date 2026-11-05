import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenDoWebhookValido } from "@/lib/asaas";
import { processarEventoAsaas } from "@/lib/asaas-eventos";

export async function POST(request: Request) {
  if (!tokenDoWebhookValido(request.headers.get("asaas-access-token"))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const ev = await request.json().catch(() => null);
  if (!ev || typeof ev !== "object") return NextResponse.json({ ok: true });

  // O Asaas entrega "pelo menos uma vez": o mesmo evento pode chegar repetido.
  const eventoId: string | undefined = typeof ev.id === "string" ? ev.id : undefined;
  if (eventoId && (await prisma.webhookEvento.findUnique({ where: { id: eventoId } }))) {
    return NextResponse.json({ ok: true });
  }

  let ok = false;
  try {
    ok = await processarEventoAsaas(ev);
  } catch (e) {
    console.error("Asaas webhook falhou", e);
  }
  // 500 faz o Asaas reenviar; depois de 15 falhas seguidas ele pausa a fila, então erro só quando vale a pena tentar de novo.
  if (!ok) return NextResponse.json({ error: "Tente novamente" }, { status: 500 });

  if (eventoId) await prisma.webhookEvento.create({ data: { id: eventoId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
