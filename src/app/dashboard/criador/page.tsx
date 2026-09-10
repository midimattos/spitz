import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function DashboardCriadorPage() {
  const session = await auth();

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Olá, {session?.user?.name}
      </h1>
      <p className="mt-2" style={{ color: "var(--ink-muted)" }}>
        Painel do criador.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <Link href="/dashboard/criador/plantel" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Plantel
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Cadastre cães, monte a árvore genealógica, gere o Dossiê
            Genético de cada um e guarde os documentos na Gaveta Digital.
          </p>
        </Link>

        <Link href="/dashboard/criador/cruzamentos" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Simulador de cruzamento
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Compare dois cães do plantel e veja o risco genético estimado da
            ninhada.
          </p>
        </Link>

        <Link href="/dashboard/criador/financeiro" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Financeiro
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Receitas e despesas do canil, gerais ou por cão.
          </p>
        </Link>

        <Link href="/dashboard/criador/ninhadas" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Ninhadas
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Coberturas, previsão de parto e histórico de ninhadas.
          </p>
        </Link>

        <Link href="/dashboard/criador/precificacao" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Precificação
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Configure a faixa de preço base por porte e veja a sugestão de
            cada cão na ficha dele.
          </p>
        </Link>

        <Link href="/dashboard/criador/anuncios" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Anúncios
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Publique cães do plantel no marketplace, com fotos e preço.
          </p>
        </Link>

        <Link href="/dashboard/criador/mensagens" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Mensagens
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Interesse recebido de compradores nos seus anúncios.
          </p>
        </Link>

        <Link href="/dashboard/criador/mercado" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Inteligência de Mercado <span style={{ color: "var(--brass)" }}>em breve</span>
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Tendências de demanda e liquidez de vendas de todo o
            marketplace — grátis pros primeiros assinantes quando lançar.
          </p>
        </Link>

        <Link href="/dashboard/criador/verificacao" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Verificação
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Complete os dados do seu canil e entre na fila de aprovação.
          </p>
        </Link>

        <Link href="/dashboard/criador/convites" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Convites
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Convide outros canis e pule a fila de aprovação deles.
          </p>
        </Link>
      </div>

      <div className="card mt-8 p-6">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Perfil: <strong>{session?.user?.role}</strong> · E-mail:{" "}
          {session?.user?.email}
        </p>
      </div>
    </main>
  );
}
