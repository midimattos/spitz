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
import { ArvoreGenealogica } from "../_components/arvore-genealogica";
import { DocumentoUploadForm } from "../_components/documento-upload-form";
import { LaudoGeneticoForm } from "../_components/laudo-genetico-form";
import { PainelGeneticaCor } from "../_components/painel-genetica-cor";
import { LancamentoForm } from "@/components/lancamento-form";
import { CicloCioForm } from "@/components/ciclo-cio-form";
import { NinhadaForm } from "@/components/ninhada-form";
import { RegistrarPartoForm } from "@/components/registrar-parto-form";
import { calcularCOI } from "@/lib/pedigree";
import {
  calcularIndiceQualidade,
  sugerirFaixaPreco,
  ajustarFaixaPorMercado,
  FAIXA_PADRAO_POR_PORTE,
  type FaixaPreco,
} from "@/lib/precificacao";
import { obterFatorMercadoPorPorte } from "@/lib/mercado";
import { DossieGeneticoPanel } from "@/components/dossie-genetico-panel";
import { FotoCaoUpload } from "@/components/foto-cao-upload";
import { Tabs } from "@/components/tabs";

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
      filhosComoPai: true,
      filhosComoMae: true,
      documentos: { orderBy: { criadoEm: "desc" } },
      laudosGeneticos: { include: { resultados: true }, orderBy: { criadoEm: "desc" } },
      lancamentosFinanceiros: { orderBy: { data: "desc" } },
      ciclosCio: { orderBy: { dataInicio: "desc" } },
      ninhadasComoMae: { include: { caoPai: true }, orderBy: { dataCobertura: "desc" } },
      dossieGenetico: true,
    },
  });

  if (!cao) notFound();

  const machosDisponiveis =
    cao.sexo === "FEMEA"
      ? await prisma.cao.findMany({
          where: { canilId: canil.id, sexo: "MACHO" },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : [];

  const proximoCio = preverProximoCio(cao.ciclosCio);
  const resumoFinanceiro = resumirLancamentos(cao.lancamentosFinanceiros);

  const filhos = [...cao.filhosComoPai, ...cao.filhosComoMae];

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

  const painelSaudeCompleto = [
    ...[...statusProprio].map(([condicao, { status }]) => ({
      condicao,
      status,
      origem: "TESTE_DIRETO" as const,
    })),
    ...herancaSemTesteDireto.map(([condicao, status]) => ({
      condicao,
      status,
      origem: "HERANCA_PREDITIVA" as const,
    })),
  ];

  const coiAtual = await calcularCOI(cao.id);
  const temDocumentoPedigree = cao.documentos.some((d) => d.tipo === "PEDIGREE");
  const dossiePublicado = cao.dossieGenetico?.publicado ?? false;

  const faixaConfigurada = cao.porte
    ? await prisma.faixaPrecoBase.findUnique({
        where: { canilId_porte: { canilId: canil.id, porte: cao.porte } },
      })
    : null;

  const faixaBase: FaixaPreco | null = faixaConfigurada
    ? {
        min: Number(faixaConfigurada.precoMinimo),
        medio: Number(faixaConfigurada.precoMedio),
        max: Number(faixaConfigurada.precoMaximo),
      }
    : cao.porte && FAIXA_PADRAO_POR_PORTE[cao.porte]
      ? FAIXA_PADRAO_POR_PORTE[cao.porte]
      : null;

  const indiceQualidade = calcularIndiceQualidade(
    painelSaudeCompleto,
    coiAtual,
    temDocumentoPedigree,
    dossiePublicado
  );
  const faixaSugeridaBase = faixaBase ? sugerirFaixaPreco(faixaBase, indiceQualidade.indice) : null;

  const fatorMercado =
    faixaBase && canil.assinaturaPro && cao.porte ? await obterFatorMercadoPorPorte(cao.porte) : null;

  const faixaSugerida =
    faixaBase && faixaSugeridaBase && fatorMercado !== null
      ? ajustarFaixaPorMercado(faixaBase, faixaSugeridaBase, fatorMercado)
      : faixaSugeridaBase;

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
          </div>
        </div>
      )}
    </div>
  );

  const abaGenealogia = (
    <div>
      <ArvoreGenealogica pai={cao.pai} mae={cao.mae} />

      {filhos.length > 0 && (
        <div className="mt-6">
          <p className="text-sm mb-2" style={{ color: "var(--ink-muted)" }}>
            Filhos registrados no sistema
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {filhos.map((filho) => (
              <Link
                key={filho.id}
                href={`/dashboard/criador/plantel/${filho.id}`}
                className="card px-4 py-2 text-sm hover:opacity-90"
              >
                {filho.nome}
              </Link>
            ))}
          </div>
        </div>
      )}
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

  const abaPrecificacao = !faixaBase ? (
    <div className="card p-6 text-sm" style={{ color: "var(--ink-muted)" }}>
      Configure uma{" "}
      <Link href="/dashboard/criador/precificacao" className="underline" style={{ color: "var(--brass)" }}>
        faixa de preço base
      </Link>{" "}
      para o porte &quot;{cao.porte ?? "não informado"}&quot; para ver a sugestão
      deste cão.
    </div>
  ) : (
    <div className="card p-6">
      <div className="grid sm:grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Mínimo</p>
          <p className="font-display text-xl mt-1">{formatarMoeda(faixaSugerida!.minimo)}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--brass)" }}>Ideal</p>
          <p className="font-display text-2xl mt-1" style={{ color: "var(--pine)" }}>
            {formatarMoeda(faixaSugerida!.ideal)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Teto</p>
          <p className="font-display text-xl mt-1">{formatarMoeda(faixaSugerida!.teto)}</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t text-sm space-y-1" style={{ borderColor: "var(--border-hairline)" }}>
        <p style={{ color: "var(--ink-muted)" }}>
          Índice de qualidade: <strong>{(indiceQualidade.indice * 100).toFixed(0)}%</strong>
        </p>
        <p style={{ color: "var(--ink-muted)" }}>
          · Saúde genética: {(indiceQualidade.detalhes.saudeScore * 100).toFixed(0)}%
        </p>
        <p style={{ color: "var(--ink-muted)" }}>
          · Endogamia (COI): {(indiceQualidade.detalhes.endogamiaScore * 100).toFixed(0)}%
        </p>
        <p style={{ color: "var(--ink-muted)" }}>
          · Documentação: {(indiceQualidade.detalhes.documentacaoScore * 100).toFixed(0)}%
        </p>
      </div>

      <p className="mt-4 text-xs" style={{ color: "var(--ink-muted)" }}>
        {fatorMercado !== null ? (
          <>
            Sugestão ajustada por dados reais de mercado (PRO): demanda vs. oferta
            publicada para o porte &quot;{cao.porte}&quot; neste momento
            ({fatorMercado > 0 ? "mercado aquecido" : fatorMercado < 0 ? "mercado parado" : "equilibrado"}).
            Veja o detalhe em{" "}
            <Link href="/dashboard/criador/mercado" className="underline" style={{ color: "var(--brass)" }}>
              Inteligência de Mercado
            </Link>
            .
          </>
        ) : (
          <>
            Sugestão calculada a partir da faixa base do porte &quot;{cao.porte}&quot; e da
            qualidade genética deste cão. Ative o PRO para ajustar com dados
            reais de oferta e demanda do marketplace.
          </>
        )}
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
            {LABEL_PAPEL[cao.papel]} · {LABEL_SEXO[cao.sexo]}
            {cao.corBase ? ` · ${cao.corBase}` : cao.corPelagem ? ` · ${cao.corPelagem}` : ""}
            {cao.porte ? ` · Porte ${cao.porte}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/criador/anuncios/novo"
            className="px-4 py-2 rounded text-white text-sm"
            style={{ background: "var(--pine)" }}
          >
            Criar anúncio
          </Link>
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
            { id: "genetica", label: "Genética", conteudo: abaGenetica },
            { id: "financeiro", label: "Financeiro", conteudo: abaFinanceiro },
            { id: "dossie", label: "Dossiê", conteudo: abaDossie },
            { id: "precificacao", label: "Precif.", conteudo: abaPrecificacao },
            { id: "gaveta", label: "Gav. Digi.", conteudo: abaGavetaDigital },
          ]}
        />
      </div>
    </main>
  );
}
