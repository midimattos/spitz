import { TESTE_DIAS, DIA_MS } from "@/lib/assinatura";
import { cadastroAberto, limiteCanis } from "@/lib/cadastro";
import { MARKETPLACE_ATIVO } from "@/lib/marketplace-config";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { verificarLimite, ipDe, mensagemLimite } from "@/lib/limite-taxa";
import { enviarConfirmacaoEmail } from "@/lib/confirmacao-email";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo"),
  nomeCanil: z.string().trim().max(120).optional(),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter no mínimo 8 caracteres"),
  role: z.enum(["CRIADOR", "COMPRADOR"]),
  codigoConvite: z.string().optional(),
  // campo-isca: pessoas não veem; robôs preenchem
  site: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  // No máximo 5 cadastros por hora e 15 por dia vindos do mesmo endereço.
  const ip = ipDe(request.headers);
  const [hora, dia] = await Promise.all([
    verificarLimite(`register:ip:${ip}:h`, 5, 60 * 60),
    verificarLimite(`register:ip:${ip}:d`, 15, 24 * 60 * 60),
  ]);
  if (!hora.ok || !dia.ok) {
    return NextResponse.json({ error: mensagemLimite(hora.ok ? dia : hora) }, { status: 429 });
  }
  if (parsed.success && parsed.data.site) {
    // robô: responde como se tivesse dado certo, sem criar nada
    return NextResponse.json({ id: "ok", email: parsed.data.email }, { status: 201 });
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { name, password, role, codigoConvite, nomeCanil } = parsed.data;
  if (role === "COMPRADOR" && !MARKETPLACE_ATIVO) {
    return NextResponse.json({ error: "No momento só estamos abrindo contas para criadores." }, { status: 403 });
  }
  if (role === "CRIADOR" && (!nomeCanil || nomeCanil.length < 2)) {
    return NextResponse.json({ error: "Informe o nome do seu canil" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const existente = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existente) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail" },
      { status: 409 }
    );
  }

  // Enquanto o cadastro aberto não for liberado, só entra quem tem convite válido.
  if (role === "CRIADOR" && !cadastroAberto() && !codigoConvite) {
    return NextResponse.json(
      { error: "No momento o cadastro é só por convite. Peça um código a um canil parceiro." },
      { status: 403 }
    );
  }
  // Teto opcional de canis (cadastros sem convite).
  const teto = limiteCanis();
  if (role === "CRIADOR" && teto !== null && !codigoConvite) {
    const total = await prisma.canil.count();
    if (total >= teto) {
      return NextResponse.json({ error: "As vagas deste momento já foram preenchidas. Entre na lista de espera." }, { status: 403 });
    }
  }

  // Se um código de convite foi informado, ele precisa existir e ainda
  // não ter sido usado — senão a conta é criada normalmente, só que sem
  // o benefício de verificação automática.
  let convite = null;
  if (codigoConvite) {
    convite = await prisma.convite.findUnique({ where: { codigo: codigoConvite } });
    if (!convite || convite.usadoPorCanilId) {
      return NextResponse.json({ error: "Código de convite inválido ou já usado" }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  // Todo CRIADOR precisa de um canil para poder cadastrar o plantel.
  // O nome do canil é informado no cadastro (é diferente do nome da pessoa)
  // e pode ser alterado depois em "Dados do canil".
  if (role === "CRIADOR") {
    const base = slugify(nomeCanil || `canil-${name}`) || "canil";
    const slug = `${base}-${user.id.slice(-6)}`;

    const canil = await prisma.canil.create({
      data: {
        nome: nomeCanil || `Canil ${name}`,
        slug,
        ownerId: user.id,
        // Convite válido = pula a fila de aprovação manual.
        verificado: !!convite,
        // Todos ganham o mesmo teste grátis.
        proGratisAte: new Date(Date.now() + TESTE_DIAS * DIA_MS),
      },
    });

    if (convite) {
      await prisma.convite.update({
        where: { id: convite.id },
        data: { usadoPorCanilId: canil.id, usadoEm: new Date() },
      });
      // Quem convidou ganha desconto na mensalidade seguinte (1 por canil indicado).
      if (convite.criadoPorCanilId) {
        await prisma.canil.update({ where: { id: convite.criadoPorCanilId }, data: { descontosIndicacao: { increment: 1 } } });
      }
    }
  }

  await enviarConfirmacaoEmail({ id: user.id, email: user.email, name: user.name }).catch(() => null);

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
