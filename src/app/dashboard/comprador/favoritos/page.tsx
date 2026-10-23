import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatarMoeda } from "@/lib/financeiro";
import { LABEL_SEXO } from "@/lib/labels";
import { corDoCao } from "@/lib/cores";

export default async function FavoritosPage() {
  const session = await auth();
  const favoritos = session?.user
    ? await prisma.favorito.findMany({
        where: { userId: session.user.id },
        include: { anuncio: { include: { cao: true, canil: true } } },
        orderBy: { criadoEm: "desc" },
      })
    : [];

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Favoritos
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Os filhotes que você marcou no marketplace.
      </p>

      {favoritos.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>
            Você ainda não favoritou nenhum anúncio.{" "}
            <Link href="/marketplace" className="underline" style={{ color: "var(--brass)" }}>
              Ver marketplace
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {favoritos.map((f) => {
            const a = f.anuncio;
            const disponivel = a.status === "PUBLICADO" && a.canil.verificado;
            return (
              <div key={f.id} className="card p-5 flex items-center justify-between">
                <div>
                  {disponivel ? (
                    <Link href={`/marketplace/${a.id}`} className="font-display hover:underline" style={{ color: "var(--pine)" }}>
                      {a.titulo}
                    </Link>
                  ) : (
                    <p className="font-display" style={{ color: "var(--ink-muted)" }}>
                      {a.titulo}
                    </p>
                  )}
                  <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
                    {a.canil.nome} · {LABEL_SEXO[a.cao.sexo]}
                    {corDoCao(a.cao) ? ` · ${corDoCao(a.cao)}` : ""} · {formatarMoeda(Number(a.preco))}
                  </p>
                </div>
                {!disponivel && (
                  <span className="text-xs" style={{ color: "var(--brass)" }}>
                    {a.status === "VENDIDO" ? "Vendido" : "Indisponível"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
