import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/financeiro";
import { LABEL_SEXO, LABEL_PAPEL, formatarData } from "@/lib/labels";
import { ContatoAnuncioForm } from "@/components/contato-anuncio-form";

export default async function AnuncioPublicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const anuncio = await prisma.anuncio.findFirst({
    where: { id, status: "PUBLICADO", canil: { verificado: true } },
    include: { cao: { include: { dossieGenetico: true } }, canil: true },
  });

  if (!anuncio) notFound();

  const { cao, canil } = anuncio;

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <div className="grid sm:grid-cols-2 gap-8">
        <div>
          {anuncio.fotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {anuncio.fotos.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt={anuncio.titulo} className="rounded aspect-square object-cover" />
              ))}
            </div>
          ) : (
            <div
              className="rounded aspect-square flex items-center justify-center"
              style={{ background: "var(--parchment)" }}
            >
              <span className="text-sm" style={{ color: "var(--ink-muted)" }}>Sem foto</span>
            </div>
          )}
        </div>

        <div>
          {anuncio.tipo === "PREMIUM" && (
            <span className="text-xs" style={{ color: "var(--brass)" }}>★ Destaque</span>
          )}
          <h1 className="font-display text-3xl mt-1" style={{ color: "var(--pine)" }}>
            {anuncio.titulo}
          </h1>
          <p className="font-display text-2xl mt-2" style={{ color: "var(--pine)" }}>
            {formatarMoeda(Number(anuncio.preco))}
          </p>

          <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            {LABEL_PAPEL[cao.papel]} · {LABEL_SEXO[cao.sexo]}
            {cao.corPelagem ? ` · ${cao.corPelagem}` : ""}
            {cao.porte ? ` · Porte ${cao.porte}` : ""}
            {" · "}Nascimento: {formatarData(cao.dataNascimento)}
          </p>

          <p className="mt-4 text-sm">
            <Link href={`/canil/${canil.slug}`} className="underline" style={{ color: "var(--brass)" }}>
              {canil.nome}
            </Link>
            {canil.cidade ? ` · ${canil.cidade}${canil.estado ? `/${canil.estado}` : ""}` : ""}
          </p>

          {cao.dossieGenetico?.publicado && (
            <Link
              href={`/dossie/${cao.dossieGenetico.slugPublico}`}
              className="inline-block mt-4 px-4 py-2 rounded border text-sm"
              style={{ borderColor: "var(--brass)", color: "var(--brass)" }}
            >
              Ver dossiê genético
            </Link>
          )}
        </div>
      </div>

      {anuncio.descricao && (
        <section className="mt-10">
          <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
            Sobre
          </h2>
          <p className="mt-2 text-sm whitespace-pre-line">{anuncio.descricao}</p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Entrar em contato
        </h2>
        <div className="card mt-3 p-6">
          <ContatoAnuncioForm anuncioId={anuncio.id} />
        </div>
      </section>
    </main>
  );
}
