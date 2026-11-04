import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import {
  LABEL_PAPEL,
  LABEL_SEXO,
  LABEL_TIPO_DOCUMENTO,
  LABEL_STATUS_GENETICO,
  formatarData,
  calcularIdade,
} from "@/lib/labels";
import { consolidarStatusGenetico, calcularHerancaPreditiva } from "@/lib/genetica";
import { resumirLancamentos, formatarMoeda } from "@/lib/financeiro";
import { preverProximoCio } from "@/lib/reproducao";
import { DocumentoUploadForm } from "../_components/documento-upload-form";
import { LaudoGeneticoForm } from "../_components/laudo-genetico-form";
import { PainelGeneticaCor } from "../_components/painel-genetica-cor";
import { LancamentoForm } from "@/components/lancamento-form";
import { CicloCioForm } from "@/components/ciclo-cio-form";
import { NinhadaForm } from "@/components/ninhada-form";
import { RegistrarPartoForm } from "@/components/registrar-parto-form";
import { MARKETPLACE_ATIVO } from "@/lib/marketplace-config";
import { carregarContextoMercado, carregarFaixasDoCanil, sugerirPreco } from "@/lib/mercado";
import { PainelPreco } from "@/components/painel-preco";
import { DossieGeneticoPanel } from "@/components/dossie-genetico-panel";
import { FotoCaoUpload } from "@/components/foto-cao-upload";
import { EmitirCertificado } from "@/components/emitir-certificado";
import { PedigreeUpload } from "@/components/pedigree-upload";
import { Tabs } from "@/components/tabs";
import { ArvoreEdicao } from "@/components/arvore-edicao";
import { DescendentesPainel } from "@/components/descendentes-painel";
import { VendaCao } from "@/components/venda-cao";
import { CompraCao } from "@/components/compra-cao";
import { LABEL_SEXO as ROTULO_SEXO } from "@/lib/labels";

export default async function FichaCaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canil = await getCanilDoCriadorLogado();
  if (!canil) notFound();

  const cao = await prisma.cao.findFirst({
    where: { id, canilId: canil.id },
    include: {
      pai: true,
      mae: true,
      filhosComoPai: { include: { mae: { select: { nome: true } } } },
      filhosComoMae: { include: { pai: { select: { nome: true } } } },
      ninhada: { select: { id: true, dataParto: true } },
      documentos: { orderBy: { criadoEm: "desc" } },
      laudosGeneticos: { include: { resultados: true }, orderBy: { criadoEm: "desc" } },
      lancamentosFinanceiros: { orderBy: { data: "desc" } },
      ciclosCio: { orderBy: { dataInicio: "desc" } },
      ninhadasComoMae: { include: { caoPai: true }, orderBy: { dataCobertura: "desc" } },
      dossieGenetico: true,
      descendentes: { orderBy: { criadoEm: "desc" } },
      cuidados: { select: { tipo: true, data: true, proximaData: true } },
    },
  });

  if (!cao) notFound();
  const certificadoAtual = await prisma.certificado.findFirst({ where: { caoId: cao.id, revogado: false }, orderBy: { emitidoEm: "desc" } });

  const machosDisponiveis =
    cao.sexo === "FEMEA"
      ? await prisma.cao.findMany({
          where: { canilId: canil.id, sexo: "MACHO", vendidoEm: null },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : [];

  const todosCaes = await prisma.cao.findMany({
    where: { canilId: canil.id },
    select: { id: true, nome: true, sexo: true, externo: true, registro: true, microchip: true, paiId: true, maeId: true, fotoUrl: true, corPelagem: true, corBase: true },
    orderBy: { nome: "asc" },
  });

  const proximoCio = preverProximoCio(cao.ciclosCio);
  const resumoFinanceiro = resumirLancamentos(cao.lancamentosFinanceiros);

  const [laudosPai, laudosMae] = await Promise.all([
    cao.paiId
      ? prisma.laudoGenetico.findMany({ where: { caoId: cao.paiId }, include: { resultados: true } })
      : Promise.resolve([]),
    cao.maeId
      ? prisma.laudoGenetico.findMany({ where: { caoId: cao.maeId }, include: { resultados: true } })
      : Promise.resolve([]),
  ]);

  const statusProprio = consolidarStatusGenetico(cao.laudosGeneticos);
  const statusPai = consolidarStatusGenetico(laudosPai);
  const statusMae = consolidarStatusGenetico(laudosMae);
  const heranca = calcularHerancaPreditiva(statusPai, statusMae);

  // Condições com herança preditiva, mas que ainda não têm teste direto
  // no próprio cão (o teste direto sempre tem prioridade sobre a estimativa).
  const herancaSemTesteDireto = [...heranca].filter(([condicao]) => !statusProprio.has(condicao));

  // Preço sugerido: guiado pelo que o marketplace registra (vendas reais,
  // anúncios ativos, desejos, buscas e favoritos para cães como este).
  let precoMercado: ReturnType<typeof sugerirPreco> = null;
  if (MARKETPLACE_ATIVO) {
    const [contextoMercado, faixasDoCanil] = await Promise.all([
      carregarContextoMercado(),
      carregarFaixasDoCanil(canil.id),
    ]);
    precoMercado = sugerirPreco(cao, canil.estado, contextoMercado, faixasDoCanil);
  }

  const idade = calcularIdade(cao.dataNascimento);

  // ---------- Conteúdo de cada aba ----------

  const abaDadosGerais = (
    <div className="space-y-10">
      <div className="grid sm:grid-cols-[220px_1fr] gap-6">
        <FotoCaoUpload caoId={cao.id} fotoAtual={cao.fotoUrl} />
        <div className="text-sm space-y-1">
          <p>
            <span style={{ color: "var(--ink-muted)" }}>Nascimento: </span>
            {formatarData(cao.dataNascimento)}
          </p>
          {idade && (
            <p>
              <span style={{ color: "var(--ink-muted)" }}>Idade: </span>
              {idade}
            </p>
          )}
          <p>
            <span style={{ color: "var(--ink-muted)" }}>Pai: </span>
            {cao.pai?.nome ?? "—"} · <span style={{ color: "var(--ink-muted)" }}>Mãe: </span>
            {cao.mae?.nome ?? "—"}
          </p>
          <p>
            <span style={{ color: "var(--ink-muted)" }}>Microchip: </span>
            {cao.microchip || "—"}
          </p>
          {cao.observacoes && (
            <p className="pt-2">
              <span style={{ color: "var(--ink-muted)" }}>Observações: </span>
              {cao.observacoes}
            </p>
          )}
        </div>
      </div>

      {!cao.externo && (
        <div>
          <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>Origem, compra e venda</h2>
          <div className="card mt-3 p-6 space-y-5">
            <p className="text-sm">
              <span style={{ color: "var(--ink-muted)" }}>Origem: </span>
              {cao.ninhada ? (
                <>
                  Nasceu no seu canil
                  {cao.ninhada.dataParto ? ` (ninhada de ${formatarData(cao.ninhada.dataParto)})` : ""}{" "}
                  <Link href="/dashboard/criador/ninhadas" className="underline" style={{ color: "var(--brass)" }}>ver ninhadas</Link>
                </>
              ) : (
                "Não está ligado a uma ninhada do seu canil"
              )}
            </p>
            {!cao.ninhada && (
              <CompraCao
                caoId={cao.id}
                compra={cao.valorCompra !== null ? { valor: Number(cao.valorCompra), data: cao.dataCompra ? cao.dataCompra.toISOString() : null, de: cao.compradoDe } : null}
              />
            )}
            <VendaCao
              caoId={cao.id}
              caoNome={cao.nome}
              venda={
                cao.vendidoEm
                  ? { valor: Number(cao.valorVenda ?? 0), data: cao.vendidoEm.toISOString(), compradorNome: cao.compradorNome, compradorContato: cao.compradorContato }
                  : null
              }
            />
            <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
              Compra e venda entram sozinhas no Financeiro. O nome e o contato do cliente ficam só para você.
            </p>
          </div>
        </div>
      )}

      <EmitirCertificado caoId={cao.id} codigoAtual={certificadoAtual?.codigo ?? null} />

      <PedigreeUpload
        caoId={cao.id}
        atual={(() => {
          const d = cao.documentos.find((x) => x.tipo === "PEDIGREE");
          return d ? { nome: d.nome, url: d.url } : null;
        })()}
      />

      {cao.sexo === "FEMEA" && (
        <div>
          <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
            Ciclo reprodutivo
          </h2>
          <div className="card mt-3 p-6">
            {proximoCio && (
              <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
                Próximo cio previsto: <strong style={{ color: "var(--pine)" }}>{formatarData(proximoCio.dataPrevista)}</strong>
                {!proximoCio.baseadoEmHistorico && " (estimativa padrão de 6 meses, ainda sem histórico suficiente)"}
              </p>
            )}

            {cao.ciclosCio.length > 0 && (
              <ul className="text-sm mb-4 space-y-1">
                {cao.ciclosCio.map((c) => (
                  <li key={c.id}>
                    {formatarData(c.dataInicio)}
                    {c.observacoes ? ` — ${c.observacoes}` : ""}
                  </li>
                ))}
              </ul>
            )}

            <CicloCioForm caoId={cao.id} />
          </div>

          <h3 className="font-display text-lg mt-8" style={{ color: "var(--pine)" }}>
            Ninhadas
          </h3>
          <div className="card mt-3 p-6">
            {cao.ninhadasComoMae.length > 0 && (
              <ul className="space-y-3 mb-6">
                {cao.ninhadasComoMae.map((n) => (
                  <li key={n.id} className="text-sm border-b pb-3" style={{ borderColor: "var(--border-hairline)" }}>
                    <p>
                      Cobertura: {formatarData(n.dataCobertura)} ·{" "}
                      {n.caoPai?.nome ?? n.padreadorExterno ?? "padreador não informado"}
                    </p>
                    <p style={{ color: "var(--ink-muted)" }}>
                      {n.dataParto ? (
                        <>Parto: {formatarData(n.dataParto)} · {n.quantidadeFilhotes} filhote(s)</>
                      ) : (
                        <>Parto previsto: {formatarData(n.dataPrevistaParto)}</>
                      )}
                    </p>
                    {!n.dataParto && <RegistrarPartoForm ninhadaId={n.id} />}
                  </li>
                ))}
              </ul>
            )}

            <NinhadaForm caoMaeId={cao.id} machosDisponiveis={machosDisponiveis} />
            <p className="mt-4 text-sm">
              <Link href="/dashboard/criador/ninhadas/nova" className="underline" style={{ color: "var(--brass)" }}>
                Cadastrar uma ninhada que já nasceu (com os filhotes)
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const abaGenealogia = (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href={`/dashboard/criador/plantel/${cao.id}/mapa`} className="px-4 py-2 rounded text-white text-sm" style={{ background: "var(--pine)" }}>
          Visualizar árvore genealógica (imprimir)
        </Link>
        <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Abre como um pedigree, com fotos, pronto para imprimir ou salvar em PDF.</span>
      </div>
      <ArvoreEdicao caoId={cao.id} caes={todosCaes} />

    </div>
  );

  const descendentesSistema = [
    ...cao.filhosComoPai.map((f) => ({ f, outro: f.mae?.nome ?? null })),
    ...cao.filhosComoMae.map((f) => ({ f, outro: f.pai?.nome ?? null })),
  ].sort((a, b) => (b.f.dataNascimento?.getTime() ?? 0) - (a.f.dataNascimento?.getTime() ?? 0));

  const abaDescendentes = (
    <div>
      <div>
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Descendentes ({descendentesSistema.length})
        </h2>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--ink-muted)" }}>
          Os filhos deste cão aparecem aqui sozinhos, conforme você cadastra as ninhadas. Quem foi vendido continua na lista, para você acompanhar a linhagem.
        </p>
      </div>
      {descendentesSistema.length === 0 ? (
        <div className="card mt-4 p-6 text-sm" style={{ color: "var(--ink-muted)" }}>
          Nenhum filho registrado ainda.{" "}
          <Link href="/dashboard/criador/ninhadas/nova" className="underline" style={{ color: "var(--brass)" }}>
            Cadastrar uma ninhada que já nasceu
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {descendentesSistema.map(({ f, outro }) => (
            <Link key={f.id} href={`/dashboard/criador/plantel/${f.id}`} className="card overflow-hidden block text-sm hover:opacity-90">
              {f.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.fotoUrl} alt={f.nome} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-xs" style={{ color: "var(--ink-muted)", background: "var(--parchment)" }}>sem foto</div>
              )}
              <div className="p-3 space-y-0.5">
                <p className="font-medium" style={{ color: "var(--pine)" }}>{f.nome}</p>
                <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {[ROTULO_SEXO[f.sexo], f.corBase ?? f.corPelagem, f.dataNascimento ? `nasc. ${formatarData(f.dataNascimento)}` : null].filter(Boolean).join(" · ")}
                </p>
                {outro && <p className="text-xs" style={{ color: "var(--ink-muted)" }}>com {outro}</p>}
                <p className="text-xs pt-1" style={{ color: f.vendidoEm ? "var(--brass)" : "var(--pine)" }}>
                  {f.vendidoEm
                    ? `Vendido${f.valorVenda !== null ? ` por ${formatarMoeda(Number(f.valorVenda))}` : ""}${f.compradorNome ? ` · ${f.compradorNome}` : ""}`
                    : f.dataFalecimento
                      ? "Falecido"
                      : "No plantel"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <DescendentesPainel
        caoId={cao.id}
        itens={cao.descendentes.map((d) => ({
          id: d.id,
          nome: d.nome,
          dataNascimento: d.dataNascimento ? d.dataNascimento.toISOString() : null,
          cor: d.cor,
          fotoUrl: d.fotoUrl,
          outroGenitor: d.outroGenitor,
          tutorNome: d.tutorNome,
          mostrarTutor: d.mostrarTutor,
          exibirPublico: d.exibirPublico,
        }))}
      />
    </div>
  );

  const abaGenetica = (
    <div className="space-y-10">
      <div className="card p-6">
        <PainelGeneticaCor
          fenotipo={{
            corBase: cao.corBase,
            marcacaoCor: cao.marcacaoCor,
            corTrufa: cao.corTrufa,
            diluicaoCor: cao.diluicaoCor,
            merleCor: cao.merleCor,
            intensidadeCor: cao.intensidadeCor,
            coresJaProduzidas: cao.coresJaProduzidas,
            dna: cao.temExameCorDNA
              ? {
                  B: cao.dnaLocusB ?? undefined,
                  E: cao.dnaLocusE ?? undefined,
                  K: cao.dnaLocusK ?? undefined,
                  A: cao.dnaLocusA ?? undefined,
                  D: cao.dnaLocusD ?? undefined,
                  S: cao.dnaLocusS ?? undefined,
                  M: cao.dnaLocusM ?? undefined,
                  I: cao.dnaLocusI ?? undefined,
                }
              : undefined,
          }}
        />
      </div>

      <div>
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Saúde genética
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
          Painel consolidado a partir dos laudos de saúde anexados a este cão.
        </p>

        <div className="card mt-3 p-6">
          {statusProprio.size === 0 && herancaSemTesteDireto.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Nenhum resultado genético de saúde registrado ainda.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                  <th className="font-normal pb-2">Condição</th>
                  <th className="font-normal pb-2">Status</th>
                  <th className="font-normal pb-2">Origem</th>
                </tr>
              </thead>
              <tbody>
                {[...statusProprio].map(([condicao, { status }]) => (
                  <tr key={condicao} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <td className="py-2">{condicao}</td>
                    <td className="py-2">{LABEL_STATUS_GENETICO[status]}</td>
                    <td className="py-2" style={{ color: "var(--ink-muted)" }}>
                      Teste direto
                    </td>
                  </tr>
                ))}
                {herancaSemTesteDireto.map(([condicao, status]) => (
                  <tr key={condicao} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <td className="py-2">{condicao}</td>
                    <td className="py-2">{LABEL_STATUS_GENETICO[status]}</td>
                    <td className="py-2" style={{ color: "var(--brass)" }}>
                      Herança preditiva (pai e mãe livres)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {cao.laudosGeneticos.length > 0 && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--border-hairline)" }}>
              <p className="text-sm mb-2" style={{ color: "var(--ink-muted)" }}>
                Laudos anexados
              </p>
              <ul className="space-y-1 text-sm">
                {cao.laudosGeneticos.map((laudo) => (
                  <li key={laudo.id}>
                    {laudo.laboratorio}
                    {laudo.dataLaudo ? ` · ${formatarData(laudo.dataLaudo)}` : ""}
                    {" · "}
                    {laudo.resultados.length} condiç{laudo.resultados.length === 1 ? "ão" : "ões"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--border-hairline)" }}>
            <p className="text-sm mb-3" style={{ color: "var(--ink-muted)" }}>
              Cadastrar novo laudo de saúde
            </p>
            <LaudoGeneticoForm caoId={cao.id} />
          </div>
        </div>
      </div>
    </div>
  );

  const abaFinanceiro = (
    <div className="card p-6">
      <div className="grid sm:grid-cols-3 gap-4 text-sm mb-6">
        <p>
          <span style={{ color: "var(--ink-muted)" }}>Receitas: </span>
          {formatarMoeda(resumoFinanceiro.totalReceitas)}
        </p>
        <p>
          <span style={{ color: "var(--ink-muted)" }}>Despesas: </span>
          {formatarMoeda(resumoFinanceiro.totalDespesas)}
        </p>
        <p>
          <span style={{ color: "var(--ink-muted)" }}>Saldo: </span>
          <strong style={{ color: resumoFinanceiro.saldo >= 0 ? "var(--pine)" : "#a32d2d" }}>
            {formatarMoeda(resumoFinanceiro.saldo)}
          </strong>
        </p>
      </div>

      {cao.lancamentosFinanceiros.length > 0 && (
        <ul className="divide-y mb-6" style={{ borderColor: "var(--border-hairline)" }}>
          {cao.lancamentosFinanceiros.map((l) => (
            <li key={l.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <p>{l.categoria}</p>
                <p style={{ color: "var(--ink-muted)" }}>{formatarData(l.data)}</p>
              </div>
              <span style={{ color: l.tipo === "RECEITA" ? "var(--pine)" : "#a32d2d" }}>
                {l.tipo === "RECEITA" ? "+" : "−"} {formatarMoeda(Number(l.valor))}
              </span>
            </li>
          ))}
        </ul>
      )}

      <LancamentoForm caoId={cao.id} />
    </div>
  );

  const abaDossie = (
    <div>
      <p className="text-sm mb-3" style={{ color: "var(--ink-muted)" }}>
        Passaporte digital deste cão: genealogia, saúde e coeficiente de
        endogamia, com link compartilhável opcional.
      </p>
      <div className="card p-6">
        <DossieGeneticoPanel
          caoId={cao.id}
          dossieInicial={
            cao.dossieGenetico
              ? {
                  slugPublico: cao.dossieGenetico.slugPublico,
                  publicado: cao.dossieGenetico.publicado,
                  coi: cao.dossieGenetico.coi,
                  geradoEm: cao.dossieGenetico.geradoEm.toISOString(),
                }
              : null
          }
        />
      </div>
    </div>
  );

  const abaPrecificacao = !precoMercado ? (
    <div className="card p-6 text-sm" style={{ color: "var(--ink-muted)" }}>
      Ainda não há dados de mercado para este perfil. Configure uma{" "}
      <Link href="/dashboard/criador/precificacao" className="underline" style={{ color: "var(--brass)" }}>
        faixa de preço base
      </Link>{" "}
      para o porte &quot;{cao.porte ?? "não informado"}&quot; (e informe o porte no cadastro do cão) para ver a
      sugestão. Conforme o marketplace registrar vendas, ela passa a ser guiada pelo mercado.
    </div>
  ) : (
    <div className="card p-6">
      <PainelPreco resultado={precoMercado} />
      <p className="mt-4 text-xs" style={{ color: "var(--ink-muted)" }}>
        Veja a demanda por cor e região em{" "}
        <Link href="/dashboard/criador/mercado" className="underline" style={{ color: "var(--brass)" }}>
          Inteligência de Mercado
        </Link>
        .
      </p>
    </div>
  );

  const abaGavetaDigital = (
    <div>
      <p className="text-sm mb-3" style={{ color: "var(--ink-muted)" }}>
        Pedigree, recibos, microchip, contratos e laudos deste cão.
      </p>
      <div className="card p-6">
        <DocumentoUploadForm caoId={cao.id} />

        {cao.documentos.length === 0 ? (
          <p className="mt-6 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nenhum documento anexado ainda.
          </p>
        ) : (
          <ul className="mt-6 divide-y" style={{ borderColor: "var(--border-hairline)" }}>
            {cao.documentos.map((doc) => (
              <li key={doc.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p>{doc.nome}</p>
                  <p style={{ color: "var(--ink-muted)" }}>
                    {LABEL_TIPO_DOCUMENTO[doc.tipo]} · {formatarData(doc.criadoEm)}
                  </p>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                  style={{ color: "var(--brass)" }}
                >
                  Abrir
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
            {cao.nome}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            {cao.externo ? `De outro canil${cao.canilOrigem ? ` (${cao.canilOrigem})` : ""}` : LABEL_PAPEL[cao.papel]} · {LABEL_SEXO[cao.sexo]}
            {cao.corBase ? ` · ${cao.corBase}` : cao.corPelagem ? ` · ${cao.corPelagem}` : ""}
            {cao.porte ? ` · Porte ${cao.porte}` : ""}
            {cao.registro ? ` · Registro ${cao.registro}` : ""}
          </p>
          {cao.vendidoEm && (
            <p className="mt-1 text-xs inline-block px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--brass)", color: "var(--brass)" }}>
              Vendido em {formatarData(cao.vendidoEm)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {MARKETPLACE_ATIVO && !cao.externo && (
            <Link
              href="/dashboard/criador/anuncios/novo"
              className="px-4 py-2 rounded text-white text-sm"
              style={{ background: "var(--pine)" }}
            >
              Criar anúncio
            </Link>
          )}
          <Link
            href={`/dashboard/criador/plantel/${cao.id}/editar`}
            className="px-4 py-2 rounded border text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            Editar
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <Tabs
          abas={[
            { id: "gerais", label: "Dados Gerais", conteudo: abaDadosGerais },
            { id: "genealogia", label: "Árvore Genealógica", conteudo: abaGenealogia },
            { id: "descendentes", label: "Descendentes", conteudo: abaDescendentes },
            { id: "genetica", label: "Genética", conteudo: abaGenetica },
            { id: "financeiro", label: "Financeiro", conteudo: abaFinanceiro },
            { id: "dossie", label: "Dossiê", conteudo: abaDossie },
            ...(MARKETPLACE_ATIVO ? [{ id: "precificacao", label: "Precificação", conteudo: abaPrecificacao }] : []),
            { id: "gaveta", label: "Gaveta Digital", conteudo: abaGavetaDigital },
          ]}
        />
      </div>
    </main>
  );
}
