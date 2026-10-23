import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calcularReputacao } from "@/lib/reputacao";
import { RastreadorEvento } from "@/components/rastreador-evento";
import { FavoritoButton } from "@/components/favorito-button";
import { Selos } from "@/components/selos";
import { ArvorePublica } from "@/components/arvore-publica";
import { formatarMoeda } from "@/lib/financeiro";
import { LABEL_SEXO, LABEL_PAPEL, LABEL_STATUS_GENETICO, formatarData, calcularIdade } from "@/lib/labels";
import { calcularSelos, fotosDoAnuncio } from "@/lib/marketplace";
import { ContatoAnuncioForm } from "@/components/contato-anuncio-form";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl" style={{ color: "var(--pine)" }}>{titulo}</h2>
      <div className="card mt-4 p-6">{children}</div>
    </section>
  );
}

function Ficha({ itens }: { itens: [string, string | null | undefined][] }) {
  const visiveis = itens.filter(([, v]) => v);
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
      {visiveis.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{k}</dt>
          <dd className="mt-0.5">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AnuncioPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const anuncio = await prisma.anuncio.findFirst({
    where: { id, status: "PUBLICADO", canil: { verificado: true } },
    include: {
      canil: true,
      cao: {
        include: {
          dossieGenetico: true,
          documentos: { orderBy: { criadoEm: "desc" } },
          laudosGeneticos: { include: { resultados: true }, orderBy: { criadoEm: "desc" } },
          cuidados: { orderBy: { data: "desc" } },
          ninhadasComoMae: true,
          ninhadasComoPai: true,
          pai: { include: { pai: true, mae: true } },
          mae: { include: { pai: true, mae: true } },
        },
      },
    },
  });

  if (!anuncio) notFound();

  const { cao, canil } = anuncio;
  const session = await auth();
  const ehComprador = session?.user?.role === "COMPRADOR";
  const jaFavoritou = ehComprador
    ? !!(await prisma.favorito.findUnique({
        where: { userId_anuncioId: { userId: session!.user.id, anuncioId: anuncio.id } },
        select: { id: true },
      }))
    : false;
  const reputacao = await calcularReputacao(canil.id);

  const fotos = fotosDoAnuncio(anuncio, cao);
  const selos = calcularSelos({
    canil,
    cao,
    documentos: cao.documentos,
    laudos: cao.laudosGeneticos.length,
    cuidados: cao.cuidados,
  });
  const pedigree = cao.documentos.find((d) => d.tipo === "PEDIGREE");
  const idade = calcularIdade(cao.dataNascimento);
  const ninhadas = [...cao.ninhadasComoMae, ...cao.ninhadasComoPai];
  const filhotesNascidos = ninhadas.reduce((t, n) => t + (n.quantidadeFilhotes ?? 0), 0);
  const resultados = cao.laudosGeneticos.flatMap((l) =>
    l.resultados.map((r) => ({ ...r, laboratorio: l.laboratorio, data: l.dataLaudo }))
  );
  const vacinas = cao.cuidados.filter((c) => c.tipo === "VACINA");
  const outrosCuidados = cao.cuidados.filter((c) => c.tipo !== "VACINA");

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 sm:px-8 py-10">
      <RastreadorEvento tipo="VISUALIZACAO_ANUNCIO" anuncioId={anuncio.id} />

      <div className="grid md:grid-cols-[1.1fr_1fr] gap-10">
        <div>
          {fotos.length > 0 ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotos[0]} alt={anuncio.titulo} className="w-full aspect-[4/3] object-cover rounded" />
              {fotos.length > 1 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {fotos.slice(1, 9).map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full aspect-square object-cover rounded hover:opacity-90" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded aspect-[4/3] flex items-center justify-center" style={{ background: "var(--parchment)", border: "1px solid var(--border-hairline)" }}>
              <span className="text-sm" style={{ color: "var(--ink-muted)" }}>Fotos em breve</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--brass)" }}>
            {LABEL_PAPEL[cao.papel]} · {LABEL_SEXO[cao.sexo]}
            {cao.porte ? ` · ${cao.porte}` : ""}
          </p>
          <h1 className="font-display text-4xl mt-2 leading-tight" style={{ color: "var(--pine)" }}>
            {anuncio.titulo}
          </h1>
          <p className="font-display text-3xl mt-4" style={{ color: "var(--pine)" }}>
            {formatarMoeda(Number(anuncio.preco))}
          </p>

          <div className="mt-5">
            <Selos selos={selos} />
          </div>

          <div className="mt-6 pt-6 border-t text-sm" style={{ borderColor: "var(--border-hairline)" }}>
            <Link href={`/canil/${canil.slug}`} className="font-display text-lg underline" style={{ color: "var(--pine)" }}>
              {canil.nome}
            </Link>
            {(canil.cidade || canil.estado) && (
              <p style={{ color: "var(--ink-muted)" }}>{[canil.cidade, canil.estado].filter(Boolean).join(" / ")}</p>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{reputacao.resumo}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <a href="#contato" className="px-6 py-3 rounded text-white text-sm" style={{ background: "var(--pine)" }}>
              Tenho interesse
            </a>
            <FavoritoButton anuncioId={anuncio.id} inicial={jaFavoritou} logadoComoComprador={ehComprador} />
          </div>
        </div>
      </div>

      {anuncio.descricao && (
        <Secao titulo="Sobre este cão">
          <p className="text-sm whitespace-pre-line leading-relaxed">{anuncio.descricao}</p>
        </Secao>
      )}

      <Secao titulo="Ficha completa">
        <Ficha
          itens={[
            ["Nome", cao.nome],
            ["Tipo", LABEL_PAPEL[cao.papel]],
            ["Sexo", LABEL_SEXO[cao.sexo]],
            ["Porte", cao.porte],
            ["Nascimento", cao.dataNascimento ? formatarData(cao.dataNascimento) : null],
            ["Idade", idade],
            ["Cor base", cao.corBase ?? cao.corPelagem],
            ["Marcação", cao.marcacaoCor],
            ["Cor da trufa", cao.corTrufa],
            ["Diluição", cao.diluicaoCor],
            ["Merle", cao.merleCor],
            ["Intensidade da cor", cao.intensidadeCor],
            ["Cores já produzidas", cao.coresJaProduzidas.length ? cao.coresJaProduzidas.join(", ") : null],
            ["Exame de cor por DNA", cao.temExameCorDNA ? "Sim" : null],
          ]}
        />
        {cao.observacoes && <p className="text-sm mt-5 pt-5 border-t" style={{ borderColor: "var(--border-hairline)" }}>{cao.observacoes}</p>}
      </Secao>

      <Secao titulo="Linhagem">
        <ArvorePublica pai={cao.pai} mae={cao.mae} />
        {cao.dossieGenetico?.publicado && (
          <Link
            href={`/dossie/${cao.dossieGenetico.slugPublico}`}
            className="inline-block mt-6 px-4 py-2 rounded border text-sm"
            style={{ borderColor: "var(--brass)", color: "var(--brass)" }}
          >
            Ver dossiê completo do cão
          </Link>
        )}
      </Secao>

      <Secao titulo="Documentos e exames">
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p>Pedigree</p>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {pedigree ? `Anexado em ${formatarData(pedigree.criadoEm)}` : "Não anexado pelo criador"}
              </p>
            </div>
            {pedigree && (
              <a href={pedigree.url} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--brass)" }}>
                Ver pedigree
              </a>
            )}
          </div>
          {resultados.length > 0 ? (
            <div className="pt-4 border-t" style={{ borderColor: "var(--border-hairline)" }}>
              <p className="mb-2">Resultados de exames genéticos</p>
              <table className="w-full text-sm">
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.id} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                      <td className="py-1.5">{r.condicao}</td>
                      <td className="py-1.5">{LABEL_STATUS_GENETICO[r.status]}</td>
                      <td className="py-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>{r.laboratorio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="pt-4 border-t text-xs" style={{ borderColor: "var(--border-hairline)", color: "var(--ink-muted)" }}>
              Nenhum exame genético registrado.
            </p>
          )}
        </div>
      </Secao>

      {(vacinas.length > 0 || outrosCuidados.length > 0) && (
        <Secao titulo="Saúde e cuidados">
          <ul className="text-sm divide-y" style={{ borderColor: "var(--border-hairline)" }}>
            {[...vacinas, ...outrosCuidados].slice(0, 12).map((c) => (
              <li key={c.id} className="py-2 flex justify-between gap-4">
                <span>{c.nome}</span>
                <span style={{ color: "var(--ink-muted)" }}>
                  {formatarData(c.data)}
                  {c.proximaData ? ` · próxima ${formatarData(c.proximaData)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {ninhadas.length > 0 && (
        <Secao titulo="Histórico reprodutivo">
          <Ficha
            itens={[
              ["Ninhadas", String(ninhadas.length)],
              ["Filhotes nascidos", filhotesNascidos ? String(filhotesNascidos) : null],
            ]}
          />
        </Secao>
      )}

      <section id="contato" className="mt-10 scroll-mt-8">
        <h2 className="font-display text-2xl" style={{ color: "var(--pine)" }}>Fale com o criador</h2>
        <div className="card mt-4 p-6">
          <ContatoAnuncioForm anuncioId={anuncio.id} />
        </div>
      </section>
    </main>
  );
}
