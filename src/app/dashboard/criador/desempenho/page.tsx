import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarMoeda } from "@/lib/financeiro";
import { Tabs } from "@/components/tabs";
import {
  NOMES_MES,
  MIN_CANIS_COMPARACAO,
  calcularMelhorEpoca,
  compararComPlataforma,
  montarPerfilComprador,
  type LinhaComparativo,
  type VendaDesempenho,
} from "@/lib/desempenho";

function valor(l: LinhaComparativo, v: number | null): string {
  if (v === null) return "—";
  if (l.unidade === "dias") return `${Math.round(v)} dias`;
  if (l.unidade === "moeda") return formatarMoeda(v);
  return `${(v * 100).toFixed(1)}%`;
}

function Barras({ linhas, cor = "var(--pine)" }: { linhas: { rotulo: string; qtd: number }[]; cor?: string }) {
  const max = Math.max(1, ...linhas.map((l) => l.qtd));
  if (linhas.every((l) => l.qtd === 0)) return <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Ainda sem dados.</p>;
  return (
    <ul className="space-y-3">
      {linhas.map((l) => (
        <li key={l.rotulo} className="text-sm">
          <div className="flex justify-between"><span>{l.rotulo}</span><span style={{ color: "var(--ink-muted)" }}>{l.qtd}</span></div>
          <div className="h-1.5 rounded mt-1" style={{ background: "var(--border-hairline)" }}>
            <div className="h-1.5 rounded" style={{ width: `${(l.qtd / max) * 100}%`, background: cor }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function DesempenhoPage() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;

  const [registros, origensViews] = await Promise.all([
    prisma.vendaRegistro.findMany({
      where: { dataVenda: { gte: new Date(Date.now() - 730 * 86_400_000) } },
      include: { anuncio: { select: { cao: { select: { dataNascimento: true } } } } },
    }),
    prisma.eventoMercado.groupBy({
      by: ["origem"],
      where: { canilId: canil.id, tipo: "VISUALIZACAO_ANUNCIO", origem: { not: null }, criadoEm: { gte: new Date(Date.now() - 90 * 86_400_000) } },
      _count: { _all: true },
    }),
  ]);

  const vendas: VendaDesempenho[] = registros.map((v) => ({
    canilId: v.canilId,
    precoFinal: Number(v.precoFinal),
    precoAnunciado: Number(v.precoAnunciado),
    dias: v.diasAteVender,
    visualizacoes: v.visualizacoes,
    contatos: v.contatos,
    canal: v.canal,
    origemComprador: v.origemComprador,
    estadoComprador: v.estadoComprador,
    nascimento: v.anuncio?.cao.dataNascimento ?? null,
  }));
  const minhas = vendas.filter((v) => v.canilId === canil.id);

  const comp = compararComPlataforma(vendas, canil.id);
  const epoca = calcularMelhorEpoca(vendas, canil.id);
  const perfil = montarPerfilComprador(minhas);
  const viewsOrigem = origensViews
    .map((o) => ({ rotulo: o.origem as string, qtd: o._count._all }))
    .sort((a, b) => b.qtd - a.qtd);

  const abaComp = (
    <div className="space-y-4">
      {comp.suasVendas === 0 ? (
        <div className="card p-6 text-sm" style={{ color: "var(--ink-muted)" }}>Registre vendas (botão &quot;vendido&quot; no anúncio) para comparar seu canil com a plataforma.</div>
      ) : !comp.suficiente ? (
        <div className="card p-6 text-sm" style={{ color: "var(--ink-muted)" }}>
          A comparação aparece quando houver vendas de pelo menos {MIN_CANIS_COMPARACAO} outros canis, para ninguém ser identificado. Hoje há {comp.canisOutros}.
        </div>
      ) : (
        <div className="card p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                <th className="font-normal pb-2">Indicador</th><th className="font-normal pb-2">Seu canil</th><th className="font-normal pb-2">Mediana da plataforma</th><th className="font-normal pb-2" />
              </tr>
            </thead>
            <tbody>
              {comp.linhas.map((l) => (
                <tr key={l.rotulo} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                  <td className="py-2.5">{l.rotulo}</td>
                  <td className="py-2.5 font-medium">{valor(l, l.seu)}</td>
                  <td className="py-2.5">{valor(l, l.plataforma)}</td>
                  <td className="py-2.5 text-xs" style={{ color: l.melhor === null ? "var(--ink-muted)" : l.melhor ? "var(--pine)" : "#a32d2d" }}>
                    {l.melhor === null ? "" : l.melhor ? "Melhor que a mediana" : "Abaixo da mediana"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-3" style={{ color: "var(--ink-muted)" }}>
            Base: {comp.suasVendas} venda(s) suas e {comp.vendasOutros} de {comp.canisOutros} outros canis (24 meses). Nenhum canil é identificado.
          </p>
        </div>
      )}
    </div>
  );

  const maxVendas = Math.max(1, ...epoca.linhas.map((l) => l.vendas));
  const abaEpoca = (
    <div className="space-y-4">
      {epoca.melhorMesNascimento ? (
        <div className="card p-6">
          <p className="text-sm">
            Filhotes que nascem em <strong>{NOMES_MES[epoca.melhorMesNascimento - 1]}</strong> são os que vendem mais rápido. Para isso, a cobertura ideal é em{" "}
            <strong>{NOMES_MES[(epoca.mesCobertura as number) - 1]}</strong>.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Base: vendas do {epoca.baseadoEm}.</p>
        </div>
      ) : (
        <div className="card p-6 text-sm" style={{ color: "var(--ink-muted)" }}>
          Ainda não há vendas suficientes (mínimo de 3 por mês de nascimento) para indicar a melhor época. Registre as vendas e a data de nascimento dos cães.
        </div>
      )}
      <div className="card p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
              <th className="font-normal pb-2">Mês de nascimento</th><th className="font-normal pb-2">Vendas</th><th className="font-normal pb-2">Tempo mediano</th><th className="font-normal pb-2">Preço mediano</th>
            </tr>
          </thead>
          <tbody>
            {epoca.linhas.map((l) => (
              <tr key={l.mes} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                <td className="py-2 capitalize">{NOMES_MES[l.mes - 1]}</td>
                <td className="py-2"><span className="inline-block h-1.5 rounded mr-2 align-middle" style={{ width: `${(l.vendas / maxVendas) * 60}px`, background: "var(--pine)" }} />{l.vendas}</td>
                <td className="py-2">{l.medianaDias !== null ? `${Math.round(l.medianaDias)} dias` : "—"}</td>
                <td className="py-2">{l.precoMediano !== null ? formatarMoeda(l.precoMediano) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const abaPerfil = (
    <div className="space-y-5">
      {perfil.total === 0 ? (
        <div className="card p-6 text-sm" style={{ color: "var(--ink-muted)" }}>Registre vendas com os dados do comprador para ver o perfil de quem fecha com você.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="card p-6"><h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Faixa de valor</h3><Barras linhas={perfil.porFaixa} /></div>
          <div className="card p-6"><h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Região do comprador</h3><Barras linhas={perfil.porEstado} cor="var(--brass)" /></div>
          <div className="card p-6"><h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Como o comprador chegou</h3><Barras linhas={perfil.porOrigem} /></div>
          <div className="card p-6"><h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Como a venda foi fechada</h3><Barras linhas={perfil.porCanal} cor="var(--brass)" /></div>
        </div>
      )}
      <div className="card p-6">
        <h3 className="font-display text-lg mb-1" style={{ color: "var(--pine)" }}>De onde vêm as visitas dos seus anúncios (90 dias)</h3>
        <p className="text-xs mb-3" style={{ color: "var(--ink-muted)" }}>Dica: divulgue o link do anúncio com <code>?utm_source=instagram</code> para medir cada rede.</p>
        <Barras linhas={viewsOrigem} />
      </div>
    </div>
  );

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-12">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Desempenho</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>Como seu canil vende, quando vender e quem compra.</p>
      <div className="mt-8">
        <Tabs
          abas={[
            { id: "comp", label: "Você x plataforma", conteudo: abaComp },
            { id: "epoca", label: "Melhor época", conteudo: abaEpoca },
            { id: "perfil", label: "Perfil do comprador", conteudo: abaPerfil },
          ]}
        />
      </div>
    </main>
  );
}
