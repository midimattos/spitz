import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContratoAceite } from "@/components/contrato-aceite";
import { ImprimirButton } from "@/components/imprimir-button";

export const metadata: Metadata = { title: "Contrato de venda", robots: { index: false } };

export default async function ContratoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await prisma.contrato.findUnique({ where: { token }, include: { venda: true } });
  if (!c) notFound();
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 sm:px-8 py-12">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Contrato de venda</h1>
      <article className="card mt-6 p-6 text-sm leading-relaxed whitespace-pre-line">{c.texto}</article>
      <p className="text-xs mt-2 break-all" style={{ color: "var(--ink-muted)" }}>Impressão digital do documento (SHA-256): {c.hash}</p>
      {c.aceitoEm ? (
        <div className="card mt-6 p-6 text-sm">
          <p style={{ color: "var(--pine)" }}><strong>Contrato aceito</strong> por {c.aceitoNome} em {c.aceitoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p>
          <div className="mt-3"><ImprimirButton /></div>
        </div>
      ) : (
        <ContratoAceite token={token} nomeSugerido={c.venda.compradorNome ?? ""} />
      )}
    </main>
  );
}
