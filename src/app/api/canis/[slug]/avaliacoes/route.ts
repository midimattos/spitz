import { NextResponse } from "next/server";

// Avaliações só podem ser feitas por compradores reais, pelo link enviado depois
// de uma venda registrada (ver /avaliar/[token]).
export async function POST() {
  return NextResponse.json(
    { error: "As avaliações são feitas pelo link enviado ao comprador depois da venda registrada." },
    { status: 403 }
  );
}
