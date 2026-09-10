import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { salvarArquivo } from "@/lib/storage";

const resultadoSchema = z.object({
  condicao: z.string().min(1),
  status: z.enum(["LIVRE", "PORTADOR", "AFETADO"]),
  observacao: z.string().optional(),
});

const resultadosSchema = z.array(resultadoSchema).min(1, "Adicione ao menos um resultado");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: caoId } = await params;
  const cao = await prisma.cao.findFirst({ where: { id: caoId, canilId: canil.id } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");
  const laboratorio = String(formData.get("laboratorio") ?? "").trim();
  const dataLaudo = String(formData.get("dataLaudo") ?? "");
  const resultadosRaw = formData.get("resultados");

  if (!laboratorio) {
    return NextResponse.json({ error: "Informe o laboratório" }, { status: 400 });
  }

  let resultadosParsed;
  try {
    resultadosParsed = resultadosSchema.safeParse(JSON.parse(String(resultadosRaw ?? "[]")));
  } catch {
    return NextResponse.json({ error: "Resultados em formato inválido" }, { status: 400 });
  }

  if (!resultadosParsed.success) {
    return NextResponse.json(
      { error: resultadosParsed.error.issues[0]?.message ?? "Resultados inválidos" },
      { status: 400 }
    );
  }

  let documentoId: string | undefined;
  if (arquivo instanceof File && arquivo.size > 0) {
    const { url } = await salvarArquivo(arquivo, caoId);
    const documento = await prisma.documento.create({
      data: {
        caoId,
        tipo: "LAUDO_GENETICO",
        nome: arquivo.name,
        url,
      },
    });
    documentoId = documento.id;
  }

  const laudo = await prisma.laudoGenetico.create({
    data: {
      caoId,
      laboratorio,
      dataLaudo: dataLaudo ? new Date(dataLaudo) : null,
      documentoId,
      resultados: {
        create: resultadosParsed.data,
      },
    },
    include: { resultados: true },
  });

  return NextResponse.json(laudo, { status: 201 });
}
