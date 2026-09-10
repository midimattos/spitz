import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/financeiro";
import { LABEL_SEXO } from "@/lib/labels";
import type { Prisma } from "@prisma/client";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ porte?: string; sexo?: string; precoMax?: string }>;
}) {
  const { porte, sexo, precoMax } = await searchParams;

  const where: Prisma.AnuncioWhereInput = {
    status: "PUBLICADO",
    canil: { verificado: true },
    ...(precoMax ? { preco: { lte: parseFloat(precoMax) } } : {}),
    cao: {
      ...(porte ? { porte } : {}),
      ...(sexo ? { sexo: sexo as "MACHO" | "FEMEA" } : {}),
    },
  };

  const anuncios = await prisma.anuncio.findMany({
    where,
    include: { cao: true, canil: true },
    orderBy: [{ tipo: "desc" }, { criadoEm: "desc" }],
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Marketplace
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Filhotes de canis verificados.
      </p>

      <form method="GET" className="card mt-8 p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Porte
          </label>
          <select
            name="porte"
            defaultValue={porte ?? ""}
            className="px-3 py-2 rounded border bg-transparent text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <option value="">Qualquer</option>
            <option value="Anão">Anão</option>
            <option value="Pequeno">Pequeno</option>
            <option value="Médio">Médio</option>
          </select>
        </div>
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Sexo
          </label>
          <select
            name="sexo"
            defaultValue={sexo ?? ""}
            className="px-3 py-2 rounded border bg-transparent text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <option value="">Qualquer</option>
            <option value="MACHO">Macho</option>
            <option value="FEMEA">Fêmea</option>
          </select>
        </div>
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Preço até (R$)
          </label>
          <input
            name="precoMax"
            defaultValue={precoMax ?? ""}
            inputMode="decimal"
            className="px-3 py-2 rounded border bg-transparent text-sm w-32"
            style={{ borderColor: "var(--border-hairline)" }}
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2 rounded text-white text-sm"
          style={{ background: "var(--pine)" }}
        >
          Filtrar
        </button>
      </form>

      {anuncios.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>Nenhum anúncio encontrado com esses filtros.</p>
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {anuncios.map((a) => (
            <Link
              key={a.id}
              href={`/marketplace/${a.id}`}
              className="card overflow-hidden hover:opacity-90 flex flex-col"
            >
              <div
                className="aspect-square flex items-center justify-center"
                style={{ background: "var(--parchment)" }}
              >
                {a.fotos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.fotos[0]} alt={a.titulo} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Sem foto
                  </span>
                )}
              </div>
              <div className="p-4">
                {a.tipo === "PREMIUM" && (
                  <span className="text-xs" style={{ color: "var(--brass)" }}>
                    ★ Destaque
                  </span>
                )}
                <h3 className="font-display text-lg mt-1" style={{ color: "var(--pine)" }}>
                  {a.titulo}
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
                  {a.canil.nome} · {LABEL_SEXO[a.cao.sexo]}
                  {a.cao.porte ? ` · ${a.cao.porte}` : ""}
                </p>
                <p className="font-display text-lg mt-2" style={{ color: "var(--pine)" }}>
                  {formatarMoeda(Number(a.preco))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
