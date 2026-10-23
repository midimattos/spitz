import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { LABEL_STATUS_ANUNCIO } from "@/lib/marketplace";
import { formatarMoeda } from "@/lib/financeiro";

export default async function AnunciosPage() {
  const canil = await getCanilDoCriadorLogado();

  const anuncios = canil
    ? await prisma.anuncio.findMany({
        where: { canilId: canil.id },
        include: { cao: true },
        orderBy: { criadoEm: "desc" },
      })
    : [];

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
            Anúncios
          </h1>
          {!canil?.verificado && (
            <p className="mt-1 text-sm" style={{ color: "var(--brass)" }}>
              Seu canil ainda não foi verificado — anúncios publicados só
              aparecem no marketplace público depois da aprovação da equipe.
            </p>
          )}
        </div>
        <Link
          href="/dashboard/criador/anuncios/novo"
          className="px-4 py-2 rounded text-white text-sm"
          style={{ background: "var(--pine)" }}
        >
          Criar anúncio
        </Link>
      </div>

      {anuncios.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>Nenhum anúncio criado ainda.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {anuncios.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/criador/anuncios/${a.id}`}
              className="card p-5 flex items-center justify-between hover:opacity-90"
            >
              <div>
                <p className="font-display text-lg" style={{ color: "var(--pine)" }}>
                  {a.titulo}
                </p>
                <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                  {a.cao.nome} · {formatarMoeda(Number(a.preco))}
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded"
                style={{ background: "var(--parchment)", color: "var(--brass)" }}
              >
                {LABEL_STATUS_ANUNCIO[a.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
