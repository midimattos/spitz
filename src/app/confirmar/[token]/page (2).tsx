import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ConfirmarCompra } from "@/components/confirmar-compra";

export const metadata: Metadata = { title: "Confirmar compra", robots: { index: false } };

export default async function ConfirmarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const v = await prisma.vendaRegistro.findUnique({ where: { tokenAvaliacao: token }, include: { canil: true, anuncio: { include: { cao: true } } } });
  if (!v) notFound();
  return (
    <main className="flex-1 max-w-xl mx-auto w-full px-6 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Confirmar sua compra</h1>
      <p className="mt-3 text-sm">
        O canil <strong>{v.canil.nome}</strong> registrou a venda do filhote <strong>{v.anuncio?.cao.nome ?? ""}</strong> para você.
        Você confirma que comprou?
      </p>
      {v.confirmadaEm ? <p className="card p-5 mt-4 text-sm" style={{ color: "var(--pine)" }}>Compra já confirmada. Obrigado!</p> : <ConfirmarCompra token={token} />}
    </main>
  );
}
