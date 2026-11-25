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
import { MARKETPLACE_ATIVO } from "@/lib/marketplace-config";
import { CopiarTextoButton } from "@/components/copiar-texto-button";
import { ArvorePublica } from "@/components/arvore-publica";
import { GaleriaFotos, FotosFilhote } from "@/components/galeria-publica";
import { estadoDaNinhada } from "@/lib/ninhadas";

export async function carregarCanilPublico(slug: string) {
  return prisma.canil.findFirst({
    where: { slug, verificado: true },
    include: {
      anuncios: { where: { status: "PUBLICADO" }, include: { cao: { include: { documentos: { select: { tipo: true } } } } }, orderBy: { criadoEm: "desc" } },
      avaliacoes: { where: { oculta: false }, orderBy: { criadoEm: "desc" } },
      caes: {
        where: { externo: false, exibirNoCanil: true, dataFalecimento: null, vendidoEm: null, papel: { in: ["MATRIZ", "PADREADOR"] } },
        orderBy: { nome: "asc" },
      },
    },
  });
}

const ABAS = [
  { id: "home", rotulo: "Home" },
  { id: "filhotes", rotulo: "Filhotes" },
  { id: "ninhadas", rotulo: "Ninhadas" },
  { id: "galeria", rotulo: "Galeria" },
  { id: "contato", rotulo: "Contato" },
] as const;
type AbaId = (typeof ABAS)[number]["id"];

function linkWhatsapp(telefone: string | null | undefined, texto: string) {
  const d = (telefone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  const numero = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

function idadeTexto(nasc: Date | null) {
  if (!nasc) return null;
  const dias = Math.floor((Date.now() - nasc.getTime()) / 86_400_000);
  if (dias < 0) return null;
  if (dias < 14) return `${dias} dia${dias === 1 ? "" : "s"}`;
  if (dias < 70) return `${Math.floor(dias / 7)} semanas`;
  const meses = Math.floor(dias / 30.4);
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function descricaoCor(c: { corBase: string | null; marcacaoCor: string | null; merleCor: string | null }) {
  const partes: string[] = [];
  if (c.corBase) partes.push(c.corBase);
  if (c.marcacaoCor && !["Sólido", "Solido"].includes(c.marcacaoCor) && c.marcacaoCor !== c.corBase) partes.push(c.marcacaoCor);
  if (c.merleCor && !/^n[ãa]o/i.test(c.merleCor)) partes.push(c.merleCor);
  return partes.join(" · ");
}

function Titulo({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl" style={{ color: "var(--pine)" }}>{children}</h2>
      {sub && <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>{sub}</p>}
    </div>
  );
}

function FotoRedonda({ url, nome }: { url: string | null; nome: string }) {
  return (
    <div className="w-full aspect-square overflow-hidden rounded flex items-center justify-center" style={{ background: "var(--parchment)" }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={nome} className="w-full h-full object-cover" />
      ) : (
        <span className="font-display text-3xl" style={{ color: "var(--ink-muted)" }}>{nome.slice(0, 1)}</span>
      )}
    </div>
  );
}

export async function PaginaCanil({ slug, aba: abaBruta }: { slug: string; aba?: string }) {
  const canil = await carregarCanilPublico(slug);
  if (!canil) notFound();
  const aba: AbaId = ABAS.some((a) => a.id === abaBruta) ? (abaBruta as AbaId) : "home";

  const [reputacao, vendas] = await Promise.all([
    calcularReputacao(canil.id),
    contarVendasConfiaveisPorCanil().then((m) => m.get(canil.id) ?? 0),
  ]);

  const filhotes =
    aba === "home" || aba === "filhotes"
      ? await prisma.cao.findMany({
          where: { canilId: canil.id, externo: false, exibirNoCanil: true, papel: "FILHOTE", dataFalecimento: null, vendidoEm: null, ninhadaId: { not: null } },
          orderBy: [{ dataNascimento: "desc" }, { criadoEm: "desc" }],
          select: {
            id: true, nome: true, sexo: true, fotoUrl: true, dataNascimento: true, corBase: true, marcacaoCor: true, merleCor: true,
            fotos: { orderBy: { criadoEm: "asc" }, select: { url: true } },
            ninhada: { select: { caoMae: { select: { nome: true } }, caoPai: { select: { nome: true } }, padreadorExterno: true } },
          },
        })
      : [];

  const ninhadas =
    aba === "ninhadas"
      ? await prisma.ninhada.findMany({
          where: { caoMae: { canilId: canil.id, externo: false } },
          orderBy: { dataCobertura: "desc" },
          select: {
            id: true, dataParto: true, dataPrevistaParto: true, padreadorExterno: true,
            caoMae: { select: { nome: true, fotoUrl: true, corBase: true, pai: { select: { nome: true, corBase: true } }, mae: { select: { nome: true, corBase: true } } } },
            caoPai: { select: { nome: true, fotoUrl: true, corBase: true, pai: { select: { nome: true, corBase: true } }, mae: { select: { nome: true, corBase: true } } } },
            filhotes: { select: { sexo: true, vendidoEm: true, dataFalecimento: true, exibirNoCanil: true } },
          },
        })
      : [];

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
  const instagram = canil.instagram ? canil.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") : null;
  const zapGeral = linkWhatsapp(canil.telefoneContato, `Olá! Conheci o ${canil.nome} pelo site e gostaria de saber mais sobre os filhotes.`);
  const local = canil.cidade ? `${canil.cidade}${canil.estado ? `/${canil.estado}` : ""}` : null;
  const hrefAba = (id: AbaId) => (id === "home" ? `/${canil.slug}` : `/${canil.slug}?aba=${id}`);

  function CardFilhote({ f }: { f: (typeof filhotes)[number] }) {
    const fotos = [f.fotoUrl, ...f.fotos.map((x) => x.url)].filter((u, i, arr): u is string => !!u && arr.indexOf(u) === i);
    const cor = descricaoCor(f);
    const idade = idadeTexto(f.dataNascimento);
    const pais = f.ninhada ? [f.ninhada.caoPai?.nome ?? f.ninhada.padreadorExterno, f.ninhada.caoMae?.nome].filter(Boolean).join(" × ") : null;
    const zap = linkWhatsapp(canil!.telefoneContato, `Olá! Vi o filhote ${f.nome} (${f.sexo === "MACHO" ? "macho" : "fêmea"}) no site do ${canil!.nome} e gostaria de mais informações.`);
    return (
      <article className="card p-3 flex flex-col">
        <FotosFilhote fotos={fotos} alt={`${f.nome} — filhote de Spitz Alemão`} />
        <div className="pt-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-lg" style={{ color: "var(--pine)" }}>{f.nome}</p>
            <span className="text-[11px] px-2 py-0.5 rounded-full text-white" style={{ background: "var(--pine)" }}>Disponível</span>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
            {[f.sexo === "MACHO" ? "Macho" : "Fêmea", cor, idade].filter(Boolean).join(" · ")}
          </p>
          {pais && <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>Filho de {pais}</p>}
          <div className="mt-auto pt-3">
            {zap ? (
              <a href={zap} target="_blank" rel="noreferrer" className="block text-center px-4 py-2 rounded text-sm text-white" style={{ background: "#1f9d55" }}>
                Tenho interesse
              </a>
            ) : (
              <Link href={hrefAba("contato")} className="block text-center px-4 py-2 rounded border text-sm" style={{ borderColor: "var(--border-hairline)" }}>
                Como falar com o canil
              </Link>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="flex-1 w-full pb-16">
      <RastreadorEvento tipo="VISUALIZACAO_CANIL" canilSlug={canil.slug} />

      <header className="w-full border-b" style={{ borderColor: "var(--border-hairline)", background: "var(--parchment-card)" }}>
        <div className="max-w-5xl mx-auto px-6 sm:px-8 pt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <Link href={hrefAba("home")} className="font-display text-xl pb-1" style={{ color: "var(--pine)" }}>{canil.nome}</Link>
          <nav className="flex gap-5 overflow-x-auto text-sm" aria-label="Seções do canil">
            {ABAS.map((a) => (
              <Link
                key={a.id}
                href={hrefAba(a.id)}
                scroll={false}
                className="pb-3 pt-1 border-b-2 whitespace-nowrap"
                style={{ borderColor: a.id === aba ? "var(--brass)" : "transparent", color: a.id === aba ? "var(--pine)" : "var(--ink-muted)", fontWeight: a.id === aba ? 600 : 400 }}
                aria-current={a.id === aba ? "page" : undefined}
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {aba === "home" && (
        <section
          className="relative w-full"
          style={{ background: capa ? `linear-gradient(rgba(18,36,29,0.55), rgba(18,36,29,0.75)), url(${capa}) center/cover` : "var(--pine)" }}
        >
          <div className="max-w-5xl mx-auto px-6 sm:px-8 py-14 sm:py-20 text-white">
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "#e3c999" }}>Canil de Spitz Alemão</p>
            <h1 className="font-display text-4xl sm:text-5xl mt-3">{canil.nome}</h1>
            <p className="mt-3 text-sm opacity-90">
              {[local, `Membro desde ${membroDesde}`, notaVerificada !== null && `★ ${notaVerificada.toFixed(1)} (${verificadas.length})`].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={hrefAba("filhotes")} className="px-5 py-2.5 rounded text-sm" style={{ background: "#e3c999", color: "#12241d" }}>Ver filhotes disponíveis</Link>
              {zapGeral && <a href={zapGeral} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded border border-white/60 text-sm">WhatsApp</a>}
              {instagram && <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded border border-white/60 text-sm">@{instagram}</a>}
              <CopiarTextoButton texto={`/${canil.slug}`} rotulo="Copiar link do canil" className="px-5 py-2.5 rounded border border-white/60 text-sm" />
            </div>
          </div>
        </section>
      )}

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        {aba === "home" && (
          <>
            {conquistas.length > 0 && <div className="mt-8"><Selos selos={conquistas} /></div>}

            {canil.descricao && (
              <section className="mt-10">
                <Titulo>Nossa história</Titulo>
                <p className="text-sm leading-relaxed whitespace-pre-line max-w-3xl">{canil.descricao}</p>
              </section>
            )}

            {canil.caes.length > 0 && (
              <section className="mt-12">
                <Titulo sub="Os reprodutores que formam as nossas ninhadas.">Nosso plantel</Titulo>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {canil.caes.map((c) => (
                    <div key={c.id} className="card overflow-hidden">
                      <div className="aspect-[4/5]" style={{ background: "var(--parchment)" }}>
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

            {filhotes.length > 0 && (
              <section className="mt-12">
                <Titulo sub="Filhotes que estão procurando uma família.">Filhotes disponíveis</Titulo>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filhotes.slice(0, 3).map((f) => <CardFilhote key={f.id} f={f} />)}
                </div>
                {filhotes.length > 3 && (
                  <p className="mt-4"><Link href={hrefAba("filhotes")} className="text-sm underline" style={{ color: "var(--brass)" }}>Ver todos os {filhotes.length} filhotes →</Link></p>
                )}
              </section>
            )}

            {canil.avaliacoes.length > 0 && (
              <section className="mt-12">
                <Titulo>Avaliações de quem comprou</Titulo>
                <ul className="grid md:grid-cols-2 gap-4">
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
              </section>
            )}
          </>
        )}

        {aba === "filhotes" && (
          <section className="mt-10">
            <Titulo sub="Clique na foto para ampliar. Para reservar, fale direto com o canil.">Filhotes disponíveis</Titulo>
            {filhotes.length === 0 ? (
              <div className="card p-6 text-sm">
                <p>Nenhum filhote disponível no momento.</p>
                <p className="mt-1" style={{ color: "var(--ink-muted)" }}>
                  Veja as <Link href={hrefAba("ninhadas")} className="underline" style={{ color: "var(--brass)" }}>próximas ninhadas</Link> ou deixe seu contato para ser avisado.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filhotes.map((f) => <CardFilhote key={f.id} f={f} />)}
              </div>
            )}

            {MARKETPLACE_ATIVO && canil.anuncios.length > 0 && (
              <div className="mt-12">
                <Titulo>À venda na plataforma</Titulo>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {canil.anuncios.map((a) => {
                    const foto = fotosDoAnuncio(a, a.cao)[0];
                    return (
                      <Link key={a.id} href={`/marketplace/${a.id}`} className="card overflow-hidden block">
                        <div className="aspect-[4/5] flex items-center justify-center" style={{ background: "var(--parchment)" }}>
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
              </div>
            )}
          </section>
        )}

        {aba === "ninhadas" && <AbaNinhadas ninhadas={ninhadas} hrefContato={hrefAba("contato")} />}

        {aba === "galeria" && (
          <section className="mt-10">
            <Titulo>Galeria</Titulo>
            {canil.fotos.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>O canil ainda não publicou fotos na galeria.</p>
            ) : (
              <GaleriaFotos fotos={canil.fotos} alt={`Foto do canil ${canil.nome}`} />
            )}
          </section>
        )}

        {aba === "contato" && (
          <section className="mt-10 max-w-xl">
            <Titulo sub="Fale direto com o criador. A resposta costuma ser mais rápida pelo WhatsApp.">Contato</Titulo>
            <div className="card p-6 space-y-4 text-sm">
              {local && <p><span style={{ color: "var(--ink-muted)" }}>Localização:</span> {local}</p>}
              {canil.telefoneContato && <p><span style={{ color: "var(--ink-muted)" }}>Telefone:</span> {canil.telefoneContato}</p>}
              <div className="flex flex-wrap gap-3">
                {zapGeral && <a href={zapGeral} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded text-white" style={{ background: "#1f9d55" }}>Chamar no WhatsApp</a>}
                {instagram && <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded border" style={{ borderColor: "var(--border-hairline)" }}>Instagram @{instagram}</a>}
              </div>
              {!zapGeral && !instagram && <p style={{ color: "var(--ink-muted)" }}>Este canil ainda não informou os contatos.</p>}
            </div>
            {MARKETPLACE_ATIVO && (
              <div className="mt-10">
                <Titulo sub="Quer ser avisado quando sair um novo filhote? Deixe seu e-mail.">Lista de espera</Titulo>
                <ListaEsperaForm slug={canil.slug} canilNome={canil.nome} />
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

type NinhadaPublica = {
  id: string;
  dataParto: Date | null;
  dataPrevistaParto: Date;
  padreadorExterno: string | null;
  caoMae: { nome: string; fotoUrl: string | null; corBase: string | null; pai: { nome: string; corBase: string | null } | null; mae: { nome: string; corBase: string | null } | null };
  caoPai: { nome: string; fotoUrl: string | null; corBase: string | null; pai: { nome: string; corBase: string | null } | null; mae: { nome: string; corBase: string | null } | null } | null;
  filhotes: { sexo: "MACHO" | "FEMEA"; vendidoEm: Date | null; dataFalecimento: Date | null; exibirNoCanil: boolean }[];
};

function CardNinhada({ n, compacto = false }: { n: NinhadaPublica; compacto?: boolean }) {
  const vivos = n.filhotes.filter((f) => !f.dataFalecimento);
  const machos = vivos.filter((f) => f.sexo === "MACHO").length;
  const femeas = vivos.filter((f) => f.sexo === "FEMEA").length;
  const disponiveis = vivos.filter((f) => !f.vendidoEm && f.exibirNoCanil).length;
  const nomePai = n.caoPai?.nome ?? n.padreadorExterno ?? "Padreador externo";
  return (
    <article className="card p-4 sm:p-5">
      <div className="grid grid-cols-[1fr_1fr] sm:grid-cols-[150px_150px_1fr] gap-4 items-start">
        <div>
          <FotoRedonda url={n.caoPai?.fotoUrl ?? null} nome={nomePai} />
          <p className="mt-1.5 text-center text-sm font-display" style={{ color: "var(--pine)" }}>{nomePai}</p>
          <p className="text-center text-[11px]" style={{ color: "var(--ink-muted)" }}>Pai</p>
        </div>
        <div>
          <FotoRedonda url={n.caoMae.fotoUrl} nome={n.caoMae.nome} />
          <p className="mt-1.5 text-center text-sm font-display" style={{ color: "var(--pine)" }}>{n.caoMae.nome}</p>
          <p className="text-center text-[11px]" style={{ color: "var(--ink-muted)" }}>Mãe</p>
        </div>
        <ul className="col-span-2 sm:col-span-1 text-sm space-y-1.5 sm:pl-4">
          {n.dataParto ? (
            <>
              <li><span style={{ color: "var(--ink-muted)" }}>Nascimento:</span> {formatarData(n.dataParto)}</li>
              <li><span style={{ color: "var(--ink-muted)" }}>Machos:</span> {machos} · <span style={{ color: "var(--ink-muted)" }}>Fêmeas:</span> {femeas}</li>
              {!compacto && <li><span style={{ color: "var(--ink-muted)" }}>Disponíveis:</span> <strong>{disponiveis}</strong></li>}
            </>
          ) : (
            <li><span style={{ color: "var(--ink-muted)" }}>Previsão de nascimento:</span> {n.dataPrevistaParto.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</li>
          )}
        </ul>
      </div>
      {n.dataParto && (n.caoPai || n.caoMae) && (
        <details className="mt-4 border-t pt-3" style={{ borderColor: "var(--border-hairline)" }}>
          <summary className="text-sm cursor-pointer" style={{ color: "var(--brass)" }}>Conheça o pedigree</summary>
          <div className="mt-3">
            <ArvorePublica pai={n.caoPai ?? (n.padreadorExterno ? { nome: n.padreadorExterno, corBase: null } : null)} mae={n.caoMae} />
          </div>
        </details>
      )}
    </article>
  );
}

function AbaNinhadas({ ninhadas, hrefContato }: { ninhadas: NinhadaPublica[]; hrefContato: string }) {
  const classificadas = ninhadas.map((n) => {
    const vivos = n.filhotes.filter((f) => !f.dataFalecimento);
    const vendidos = vivos.filter((f) => f.vendidoEm).length;
    return { n, estado: estadoDaNinhada(n, vendidos, vivos.length) };
  });
  const atuais = classificadas.filter((x) => x.estado === "FILHOTES").map((x) => x.n);
  const proximas = classificadas.filter((x) => x.estado === "GESTACAO" || x.estado === "ATRASADA").map((x) => x.n).reverse();
  const passadas = classificadas.filter((x) => x.estado === "ENTREGUE").map((x) => x.n);

  return (
    <div className="mt-10 space-y-12">
      <section>
        <Titulo sub="Ninhadas que já nasceram e têm filhotes em criação.">Ninhadas atuais</Titulo>
        {atuais.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nenhuma ninhada com filhotes no momento.</p>
        ) : (
          <div className="space-y-5">{atuais.map((n) => <CardNinhada key={n.id} n={n} />)}</div>
        )}
      </section>

      <section>
        <Titulo sub="Cruzamentos confirmados, com nascimento previsto.">Próximas ninhadas</Titulo>
        {proximas.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Nenhuma ninhada prevista agora. <Link href={hrefContato} className="underline" style={{ color: "var(--brass)" }}>Fale com o canil</Link> para entrar na fila.
          </p>
        ) : (
          <div className="space-y-5">{proximas.map((n) => <CardNinhada key={n.id} n={n} />)}</div>
        )}
      </section>

      {passadas.length > 0 && (
        <section>
          <Titulo sub="Todos os filhotes já foram para suas famílias.">Ninhadas passadas</Titulo>
          <div className="space-y-5">{passadas.map((n) => <CardNinhada key={n.id} n={n} compacto />)}</div>
        </section>
      )}
    </div>
  );
}
