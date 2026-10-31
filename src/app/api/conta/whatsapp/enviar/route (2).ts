import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verificarLimite, mensagemLimite } from "@/lib/limite-taxa";
import {
  normalizarCelularBR,
  whatsappConfigurado,
  gerarCodigo,
  hashDoCodigo,
  identificadorWhatsapp,
  enviarCodigoWhatsapp,
} from "@/lib/whatsapp";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const userId = session.user.id;

  const parsed = z.object({ numero: z.string().min(8) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe o número" }, { status: 400 });
  const numero = normalizarCelularBR(parsed.data.numero);
  if (!numero) return NextResponse.json({ error: "Número inválido. Use DDD + celular, ex: (53) 99999-9999." }, { status: 400 });

  const [porUsuario, porNumero] = await Promise.all([
    verificarLimite(`wpp-enviar:user:${userId}`, 4, 60 * 60),
    verificarLimite(`wpp-enviar:num:${numero}`, 4, 24 * 60 * 60),
  ]);
  if (!porUsuario.ok || !porNumero.ok) {
    return NextResponse.json({ error: mensagemLimite(porUsuario.ok ? porNumero : porUsuario) }, { status: 429 });
  }

  const outro = await prisma.user.findFirst({ where: { whatsapp: numero, NOT: { id: userId } }, select: { id: true } });
  if (outro) {
    return NextResponse.json({ error: "Este número já está vinculado a outra conta." }, { status: 409 });
  }

  // Guarda o número informado (o admin também enxerga, para confirmar manualmente).
  await prisma.user.update({ where: { id: userId }, data: { whatsappPendente: numero } });

  if (!whatsappConfigurado()) {
    return NextResponse.json({ ok: true, manual: true, mensagem: "Recebemos seu número. A equipe vai confirmá-lo em breve." });
  }

  const codigo = gerarCodigo();
  const id = identificadorWhatsapp(userId);
  await prisma.verificationToken.deleteMany({ where: { identifier: id } });
  await prisma.verificationToken.create({
    data: { identifier: id, token: hashDoCodigo(userId, numero, codigo), expires: new Date(Date.now() + 10 * 60 * 1000) },
  });

  const enviado = await enviarCodigoWhatsapp(numero, codigo);
  if (!enviado) {
    return NextResponse.json({ error: "Não foi possível enviar o código agora. Tente de novo em instantes." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, manual: false });
}
