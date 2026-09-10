import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validarCPF } from "@/lib/cpf";

const desejoSchema = z.object({
  porte: z.string().optional(),
  sexo: z.enum(["MACHO", "FEMEA"]).optional().or(z.literal("")),
  precoMax: z.number().positive().optional(),
  corPelagem: z.string().optional(),
  estado: z.string().optional(),
  telefone: z.string().min(8, "Informe um telefone/WhatsApp válido"),
  cpf: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPRADOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = desejoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { sexo, cpf, ...resto } = parsed.data;

  if (cpf && !validarCPF(cpf)) {
    return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
  }

  const desejo = await prisma.desejoComprador.upsert({
    where: { userId: session.user.id },
    create: {
      ...resto,
      sexo: sexo || null,
      cpf: cpf || null,
      userId: session.user.id,
    },
    update: {
      ...resto,
      sexo: sexo || null,
      cpf: cpf || null,
      ativo: true,
    },
  });

  return NextResponse.json(desejo, { status: 201 });
}
