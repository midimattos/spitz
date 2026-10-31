import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { testarConexaoIA } from "@/lib/ia";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const resultado = await testarConexaoIA();
  return NextResponse.json(resultado);
}
