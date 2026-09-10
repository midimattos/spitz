import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatarMoeda } from "@/lib/financeiro";
import { formatarData } from "@/lib/labels";
import { calcularNotaMedia } from "@/lib/marketplace";
import { AvaliacaoForm } from "@/components/avaliacao-form";

export default async function CanilPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const canil = await prisma.canil.findFirst({
    where: { slug, verificado: true },
    include: {
      anuncios: { where: { status: "PUBLICADO" }, include: { cao: true }, orderBy: { criadoEm: "desc" } },
      avaliacoes: { where: { oculta: false }, orderBy: { criadoEm: "desc" } },
    },
  });

  if (!canil) notFound();

  const session = await auth();
  const podeAvaliar = session?.user?.role === "COMPRADOR";
  const notaMedia = calcularNotaMedia(canil.avaliacoes);

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <div className="flex items-center gap-3">
        <div className="seal w-14 h-14 flex items-center justify-center shrink-0">
          <span className="text-[9px] text-center leading-tight" style={{ color: "var(--pine)" }}>
            Canil
            <br />
            verificado
          </span>
        </div>
        <div>
          <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
            {canil.nome}
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {canil.cidade ? `${canil.cidade}${canil.estado ? `/${canil.estado}` : ""}` : ""}
            {notaMedia !== null && (
              <>
                {canil.cidade ? " · " : ""}★ {notaMedia.toFixed(1)} ({canil.avaliacoes.length}{" "}
                avaliaç{canil.avaliacoes.length === 1 ? "ão" : "ões"})
              </>
            )}
          </p>
        </div>
      </div>

      {canil.descricao && <p className="mt-6 text-sm">{canil.descricao}</p>}

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Anúncios
        </h2>
        {canil.anuncios.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nenhum anúncio publicado no momento.
          </p>
        ) : (
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            {canil.anuncios.map((a) => (
              <Link key={a.id} href={`/marketplace/${a.id}`} className="card p-4 hover:opacity-90">
                <p className="font-display" style={{ color: "var(--pine)" }}>
                  {a.titulo}
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
                  {formatarMoeda(Number(a.preco))}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Avaliações
        </h2>

        <div className="card mt-3 p-6">
          {podeAvaliar ? (
            <AvaliacaoForm slug={canil.slug} />
          ) : (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              <Link href="/login" className="underline">
                Entre com uma conta de comprador
              </Link>{" "}
              para avaliar este canil.
            </p>
          )}
        </div>

        {canil.avaliacoes.length > 0 && (
          <ul className="mt-4 space-y-3">
            {canil.avaliacoes.map((av) => (
              <li key={av.id} className="card p-4 text-sm">
                <p>
                  <span style={{ color: "var(--brass)" }}>{"★".repeat(av.nota)}</span>{" "}
                  <strong>{av.autorNome}</strong>{" "}
                  <span style={{ color: "var(--ink-muted)" }}>· {formatarData(av.criadoEm)}</span>
                </p>
                {av.comentario && <p className="mt-1">{av.comentario}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
