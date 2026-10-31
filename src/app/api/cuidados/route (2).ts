import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const schema = z.object({
  caoId: z.string().min(1, "Selecione o cão"),
  tipo: z.enum(["VACINA", "VERMIFUGO", "ANTIPULGAS", "CONSULTA", "OUTRO"]),
  nome: z.string().min(1, "Informe o nome (ex.: V10, Drontal)").max(80),
  data: z.string().min(1, "Informe a data"),
  proximaData: z.string().optional(),
  observacoes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const cao = await prisma.cao.findFirst({ where: { id: parsed.data.caoId, canilId: canil.id } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado no seu plantel" }, { status: 404 });

  const data = new Date(parsed.data.data);
  const proximaData = parsed.data.proximaData ? new Date(parsed.data.proximaData) : null;
  if (Number.isNaN(data.getTime()) || (proximaData && Number.isNaN(proximaData.getTime()))) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }
  if (proximaData && proximaData < data) {
    return NextResponse.json({ error: "A próxima dose não pode ser antes da aplicação" }, { status: 400 });
  }

  const registro = await prisma.registroCuidado.create({
    data: {
      caoId: cao.id,
      tipo: parsed.data.tipo,
      nome: parsed.data.nome,
      data,
      proximaData,
      observacoes: parsed.data.observacoes || null,
    },
  });
  return NextResponse.json(registro, { status: 201 });
}
