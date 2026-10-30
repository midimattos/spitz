import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmarEmailComToken } from "@/lib/confirmacao-email";
import { verificarLimite, ipDe } from "@/lib/limite-taxa";

export async function POST(request: Request) {
  const lim = await verificarLimite(`confirmar-email:${ipDe(request.headers)}`, 20, 60 * 60);
  if (!lim.ok) return NextResponse.json({ error: "Muitas tentativas." }, { status: 429 });
  const parsed = z.object({ token: z.string().min(20) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Link inválido" }, { status: 400 });
  const ok = await confirmarEmailComToken(parsed.data.token);
  if (!ok) return NextResponse.json({ error: "Link inválido ou expirado. Peça um novo em Minha conta." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
