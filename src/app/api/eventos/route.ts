import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { registrarEvento } from "@/lib/eventos";
import { corDoCao, normalizarCor } from "@/lib/cores";

// Recebe os eventos de navegação do marketplace (visualização de anúncio,
// visualização de canil e busca com filtros). O navegador envia um
// identificador anônimo ("visitante"), sem dado pessoal.

const filtrosSchema = z
  .object({
    porte: z.string().max(30).optional(),
    sexo: z.enum(["MACHO", "FEMEA"]).optional(),
    precoMin: z.number().positive().max(1_000_000).optional(),
    precoMax: z.number().positive().max(1_000_000).optional(),
    corBase: z.string().max(40).optional(),
    marcacao: z.string().max(40).optional(),
    diluicao: z.string().max(40).optional(),
    merle: z.string().max(40).optional(),
    estado: z.string().length(2).optional(),
    cidade: z.string().max(60).optional(),
  })
  .strict();

const schema = z.object({
  tipo: z.enum(["VISUALIZACAO_ANUNCIO", "VISUALIZACAO_CANIL", "BUSCA"]),
  anuncioId: z.string().max(40).optional(),
  canilSlug: z.string().max(120).optional(),
  visitante: z.string().min(8).max(64).optional(),
  filtros: filtrosSchema.optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { tipo, anuncioId, canilSlug, visitante, filtros } = parsed.data;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (tipo === "VISUALIZACAO_ANUNCIO") {
    if (!anuncioId) return NextResponse.json({ ok: false }, { status: 400 });
    const anuncio = await prisma.anuncio.findFirst({
      where: { id: anuncioId, status: "PUBLICADO", canil: { verificado: true } },
      include: { cao: true, canil: true },
    });
    if (!anuncio) return NextResponse.json({ ok: false }, { status: 404 });
    // o dono olhando o próprio anúncio não é interesse de mercado
    if (userId && anuncio.canil.ownerId === userId) return NextResponse.json({ ok: true, ignorado: true });

    await registrarEvento({
      tipo,
      anuncioId: anuncio.id,
      canilId: anuncio.canilId,
      userId,
      visitante,
      porte: anuncio.cao.porte,
      cor: corDoCao(anuncio.cao),
      sexo: anuncio.cao.sexo,
      estado: anuncio.canil.estado,
      preco: Number(anuncio.preco),
    });
    return NextResponse.json({ ok: true });
  }

  if (tipo === "VISUALIZACAO_CANIL") {
    if (!canilSlug) return NextResponse.json({ ok: false }, { status: 400 });
    const canil = await prisma.canil.findFirst({ where: { slug: canilSlug, verificado: true } });
    if (!canil) return NextResponse.json({ ok: false }, { status: 404 });
    if (userId && canil.ownerId === userId) return NextResponse.json({ ok: true, ignorado: true });
    await registrarEvento({ tipo, canilId: canil.id, userId, visitante, estado: canil.estado });
    return NextResponse.json({ ok: true });
  }

  // BUSCA: só interessa quando há pelo menos um filtro
  if (!filtros || Object.keys(filtros).length === 0) return NextResponse.json({ ok: true, ignorado: true });
  await registrarEvento({
    tipo: "BUSCA",
    userId,
    visitante,
    porte: filtros.porte ?? null,
    cor: normalizarCor(filtros.corBase),
    sexo: filtros.sexo ?? null,
    estado: filtros.estado ? filtros.estado.toUpperCase() : null,
    preco: filtros.precoMax ?? filtros.precoMin ?? null,
    filtros,
  });
  return NextResponse.json({ ok: true });
}
