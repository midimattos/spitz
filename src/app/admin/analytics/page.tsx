import Link from "next/link";
import { calcularAnalyticsGerais } from "@/lib/analytics";
import { formatarMoeda } from "@/lib/financeiro";
import { SimpleBarChart } from "@/components/simple-bar-chart";

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{titulo}</p>
      <p className="font-display text-2xl mt-1" style={{ color: "var(--pine)" }}>{valor}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const dados = await calcularAnalyticsGerais();

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <Link href="/admin" className="text-sm underline" style={{ color: "var(--brass)" }}>
        ← Voltar ao painel
      </Link>
      <h1 className="font-display text-3xl mt-2" style={{ color: "var(--pine)" }}>
        Analytics gerais
      </h1>

      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <Card titulo="Criadores" valor={String(dados.totalCriadores)} />
        <Card titulo="Compradores" valor={String(dados.totalCompradores)} />
        <Card titulo="Novos usuários (30 dias)" valor={String(dados.novosUsuarios30Dias)} />
        <Card titulo="Canis verificados" valor={String(dados.canisVerificados)} />
        <Card titulo="Canis pendentes" valor={String(dados.canisPendentes)} />
        <Card titulo="Cães cadastrados" valor={String(dados.totalCaes)} />
        <Card titulo="GMV (vendido)" valor={formatarMoeda(dados.gmv)} />
        <Card titulo="Receita da plataforma" valor={formatarMoeda(dados.receitaTotal)} />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Anúncios por status
        </h2>
        <div className="card mt-3 p-6">
          {dados.anunciosPorStatusGrafico.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Sem anúncios ainda.</p>
          ) : (
            <SimpleBarChart dados={dados.anunciosPorStatusGrafico} cor="var(--pine)" />
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Receita por tipo de cobrança
        </h2>
        <div className="card mt-3 p-6">
          {dados.receitaPorTipoGrafico.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Nenhum pagamento aprovado ainda.
            </p>
          ) : (
            <SimpleBarChart dados={dados.receitaPorTipoGrafico} cor="var(--brass)" />
          )}
        </div>
      </section>
    </main>
  );
}
