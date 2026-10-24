import { contarVendasConfiaveisPorCanil } from "@/lib/integridade";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/financeiro";
import { formatarData, LABEL_PAPEL } from "@/lib/labels";
import { fotosDoAnuncio } from "@/lib/marketplace";
import { calcularReputacao } from "@/lib/reputacao";
import { calcularConquistas } from "@/lib/conquistas";
import { RastreadorEvento } from "@/components/rastreador-evento";
import { Selos } from "@/components/selos";
import { ListaEsperaForm } from "@/components/lista-espera-form";
import { CopiarTextoButton } from "@/components/copiar-texto-button";

export async function carregarCanilPublico(slug: string) {
  return prisma.canil.findFirst({
    where: { slug, verificado: true },
    include: {
      anuncios: { where: { status: "PUBLICADO" }, include: { cao: { include: { documentos: { select: { tipo: true } } } } }, orderBy: { criadoEm: "desc" } },
      avaliacoes: { where: { oculta: false }, orderBy: { criadoEm: "desc" } },
      caes: {
        where: { exibirNoCanil: true, dataFalecimento: null, papel: { in: ["MATRIZ", "PADREADOR"] } },
        orderBy: { nome: "asc" },
      },
    },
  });
}

export async function PaginaCanil({ slug }: { slug: string }) {
  const canil = await carregarCanilPublico(slug);
  if (!canil) notFound();

  const [reputacao, vendas] = await Promise.all([
    calcularReputacao(canil.id),
    contarVendasConfiaveisPorCanil().then((m) => m.get(canil.id) ?? 0),
  ]);

  const verificadas = canil.avaliacoes.filter((a) => a.verificada);
  const notaVerificada = verificadas.length ? verificadas.reduce((t, a) => t + a.nota, 0) / verificadas.length : null;
  const { membroDesde, conquistas } = calcularConquistas({
    criadoEm: canil.criadoEm,
    verificado: canil.verificado,
    vendas,
    avaliacoesVerificadas: verificadas.length,
    notaMediaVerificada: notaVerificada,
    horasMedianasResposta: reputacao.horasMedianasResposta,
    totalMensagens: reputacao.totalMensagens,
    anunciosPublicados: canil.anuncios.length,
    anunciosComPedigree: canil.anuncios.filter((a) => a.cao.documentos.some((d) => d.tipo === "PEDIGREE")).length,
  });

  const capa = canil.fotos[0];
  const galeria = canil.fotos.slice(1, 9);
  const instagram = canil.instagram ? canil.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") : null;

  return (
    <main className="flex-1 w-full pb-16">
      <RastreadorEvento tipo="VISUALIZACAO_CANIL" canilSlug={canil.slug} />

      <section
        className="relative w-full"
        style={{ background: capa ? `linear-gradient(rgba(18,36,29,0.55), rgba(18,36,29,0.75)), url(${capa}) center/cover` : "var(--pine)" }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16 sm:py-24 text-white">
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "#e3c999" }}>Canil de Spitz Alemão</p>
          <h1 className="font-display text-4xl sm:text-5xl mt-3">{canil.nome}</h1>
          <p className="mt-3 text-sm opacity-90">
            {[canil.cidade && `${canil.cidade}${canil.estado ? `/${canil.estado}` : ""}`, `Membro desde ${membroDesde}`, notaVerificada !== null && `★ ${notaVerificada.toFixed(1)} (${verificadas.length})`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {canil.anuncios.length > 0 && (
              <a href="#filhotes" className="px-5 py-2.5 rounded text-sm" style={{ background: "#e3c999", color: "#12241d" }}>Ver filhotes disponíveis</a>
            )}
            {instagram && (
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded border border-white/60 text-sm">@{instagram}</a>
            )}
            <CopiarTextoButton texto={`/${canil.slug}`} rotulo="Copiar link do canil" className="px-5 py-2.5 rounded border border-white/60 text-sm" />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        {conquistas.length > 0 && (
          <div className="mt-8"><Selos selos={conquistas} /></div>
        )}
        <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>{reputacao.resumo}</p>

        {canil.descricao && (
          <section className="mt-10">
            <h2 className="font-display text-2xl" style={{ color: "var(--pine)" }}>Nossa história</h2>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line max-w-3xl">{canil.descricao}</p>
          </section>
        )}

        {galeria.length > 0 && (
          <section className="mt-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {galeria.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt={`Canil ${canil.nome}`} className="w-full aspect-square object-cover rounded" />
              ))}
            </div>
          </section>
        )}

        <section id="filhotes" className="mt-12 scroll-mt-8">
          <h2 className="font-display text-2xl" style={{ color: "var(--pine)" }}>Filhotes disponíveis</h2>
          {canil.anuncios.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>Nenhum anúncio publicado no momento.</p>
          ) : (
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {canil.anuncios.map((a) => {
                const foto = fotosDoAnuncio(a, a.cao)[0];
                return (
                  <Link key={a.id} href={`/marketplace/${a.id}`} className="card overflow-hidden block">
                    <div className="aspect-square flex items-center justify-center" style={{ background: "var(--parchment)" }}>
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={foto} alt={a.titulo} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Sem foto</span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-display text-lg" style={{ color: "var(--pine)" }}>{a.titulo}</p>
                      <p className="font-display mt-1" style={{ color: "var(--pine)" }}>{formatarMoeda(Number(a.preco))}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {canil.caes.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl" style={{ color: "var(--pine)" }}>Nosso plantel</h2>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {canil.caes.map((c) => (
                <div key={c.id} className="card overflow-hidden">
                  <div className="aspect-square" style={{ background: "var(--parchment)" }}>
                    {c.fotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.fotoUrl} alt={c.nome} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-display" style={{ color: "var(--pine)" }}>{c.nome}</p>
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{LABEL_PAPEL[c.papel]}{c.corBase ? ` · ${c.corBase}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl" style={{ color: "var(--pine)" }}>Lista de espera</h2>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--ink-muted)" }}>Quer ser avisado quando sair um novo filhote? Deixe seu e-mail.</p>
          <ListaEsperaForm slug={canil.slug} canilNome={canil.nome} />
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl" style={{ color: "var(--pine)" }}>Avaliações de quem comprou</h2>
          {canil.avaliacoes.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
              As avaliações aparecem aqui depois das primeiras vendas registradas. Só compradores reais podem avaliar.
            </p>
          ) : (
            <ul className="mt-4 grid md:grid-cols-2 gap-4">
              {canil.avaliacoes.map((av) => (
                <li key={av.id} className="card p-5 text-sm">
                  <p>
                    <span style={{ color: "var(--brass)" }}>{"★".repeat(av.nota)}</span> <strong>{av.autorNome}</strong>
                    <span style={{ color: "var(--ink-muted)" }}> · {formatarData(av.criadoEm)}</span>
                  </p>
                  {av.verificada && <p className="text-[11px] mt-0.5" style={{ color: "var(--pine)" }}>✓ Compra verificada pela plataforma</p>}
                  {av.comentario && <p className="mt-2">{av.comentario}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
