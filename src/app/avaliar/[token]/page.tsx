import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AvaliarVerificadaForm } from "@/components/avaliar-verificada-form";

export const metadata = { title: "Avalie seu canil", robots: { index: false } };

export default async function AvaliarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const venda = await prisma.vendaRegistro.findUnique({
    where: { tokenAvaliacao: token },
    include: { canil: true, avaliacao: true, anuncio: { include: { cao: true } } },
  });
  if (!venda) notFound();

  return (
    <main className="flex-1 max-w-xl mx-auto w-full px-6 py-16">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--brass)" }}>Avaliação de comprador verificado</p>
      <h1 className="font-display text-3xl mt-2" style={{ color: "var(--pine)" }}>Como foi comprar com {venda.canil.nome}?</h1>
      {venda.anuncio?.cao && <p className="text-sm mt-2" style={{ color: "var(--ink-muted)" }}>Sobre o filhote {venda.anuncio.cao.nome}.</p>}
      <div className="card mt-8 p-6">
        {venda.avaliacao ? (
          <p className="text-sm" style={{ color: "var(--pine)" }}>Esta compra já foi avaliada. Obrigado!</p>
        ) : (
          <AvaliarVerificadaForm token={token} nomeInicial={venda.compradorNome?.split(" ")[0] ?? ""} />
        )}
      </div>
    </main>
  );
}
