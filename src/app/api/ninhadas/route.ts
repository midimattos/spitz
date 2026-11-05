import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { calcularDataPrevistaParto, DURACAO_GESTACAO_DIAS } from "@/lib/reproducao";
import { validarGenealogia } from "@/lib/genealogia";
import { ErroNegocio } from "@/lib/arvore-servidor";
import { criarFilhotes, filhotesSchema } from "@/lib/ninhada-filhotes";

const DIA = 86_400_000;

const ninhadaSchema = z
  .object({
    caoMaeId: z.string().min(1, "Selecione a mãe"),
    caoPaiId: z.string().optional().or(z.literal("")),
    padreadorExterno: z.string().trim().max(160).optional(),
    // Ninhada em andamento: informa a cobertura. Ninhada que já nasceu: informa o nascimento.
    dataCobertura: z.string().datetime().optional().or(z.literal("")),
    dataParto: z.string().datetime().optional().or(z.literal("")),
    quantidadeFilhotes: z.number().int().min(0).max(30).optional(),
    observacoes: z.string().max(2000).optional(),
    filhotes: filhotesSchema.optional(),
  })
  .refine((b) => b.dataCobertura || b.dataParto, { message: "Informe a data da cobertura ou a data do nascimento" })
  .refine((b) => !b.filhotes?.length || b.dataParto, { message: "Para cadastrar os filhotes, informe a data do nascimento" });

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();

  const body = await request.json().catch(() => null);
  const parsed = ninhadaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const { caoMaeId, caoPaiId, padreadorExterno, observacoes, filhotes = [] } = parsed.data;

  const mae = await prisma.cao.findFirst({ where: { id: caoMaeId, canilId: canil.id }, select: { id: true, sexo: true, porte: true } });
  if (!mae) return NextResponse.json({ error: "Mãe não encontrada no seu plantel" }, { status: 404 });

  const dataParto = parsed.data.dataParto ? new Date(parsed.data.dataParto) : null;
  const coberturaEstimada = !parsed.data.dataCobertura;
  const dataCobertura = parsed.data.dataCobertura
    ? new Date(parsed.data.dataCobertura)
    : new Date(dataParto!.getTime() - DURACAO_GESTACAO_DIAS * DIA);
  if (dataParto && dataParto.getTime() < dataCobertura.getTime()) {
    return NextResponse.json({ error: "A data do nascimento não pode ser antes da cobertura" }, { status: 400 });
  }

  try {
    let filhoteIds: string[] = [];
    const ninhada = await prisma.$transaction(
      async (tx) => {
        const erro = await validarGenealogia(canil.id, null, caoPaiId || undefined, caoMaeId, tx);
        if (erro) throw new ErroNegocio(erro, 400);

        const criada = await tx.ninhada.create({
          data: {
            caoMaeId,
            caoPaiId: caoPaiId || null,
            padreadorExterno: caoPaiId ? null : padreadorExterno || null,
            dataCobertura,
            dataPrevistaParto: dataParto && coberturaEstimada ? dataParto : calcularDataPrevistaParto(dataCobertura),
            dataParto,
            coberturaEstimada,
            quantidadeFilhotes: dataParto ? Math.max(parsed.data.quantidadeFilhotes ?? 0, filhotes.length) : null,
            observacoes: observacoes || null,
          },
        });
        if (dataParto && filhotes.length > 0) {
          filhoteIds = await criarFilhotes(tx, canil.id, criada, mae, dataParto, filhotes);
        }
        return criada;
      },
      { timeout: 30_000 }
    );
    return NextResponse.json({ ...ninhada, filhoteIds }, { status: 201 });
  } catch (e) {
    if (e instanceof ErroNegocio) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
