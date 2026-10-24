import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { podeVerInteligenciaMercado } from "@/lib/recursos";

export default async function DashboardCriadorPage() {
  const session = await auth();
  const canil = await getCanilDoCriadorLogado();
  const naoLidas = session?.user
    ? await prisma.notificacao.count({ where: { userId: session.user.id, lida: false } })
    : 0;
  const radarLiberado = podeVerInteligenciaMercado(canil);

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
            Sua faixa de preço base por porte e a sugestão de cada cão,
            guiada pelas vendas e pela procura reais do marketplace.
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
            Inteligência de Mercado{" "}
            {!radarLiberado && <span style={{ color: "var(--brass)" }}>em breve</span>}
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Demanda por cor e região, buscas mais frequentes, preços reais e
            tempo de venda — grátis pros primeiros assinantes.
          </p>
        </Link>

        <Link href="/dashboard/criador/saude" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Saúde da carteira
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Vacinas vencendo, cios e partos previstos, com resumo semanal por e-mail.
          </p>
        </Link>

        <Link href="/dashboard/criador/desempenho" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Desempenho
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Seu canil x plataforma, melhor época para cobrir e perfil de quem compra.
          </p>
        </Link>

        <Link href="/dashboard/criador/cuidados" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Cuidados
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Vacinas, vermífugo e antipulgas, com aviso antes de vencer.
          </p>
        </Link>

        <Link href="/dashboard/criador/criopreservacao" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Criopreservação
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Inventário de sêmen, embriões e óvulos congelados.
          </p>
        </Link>

        <Link href="/dashboard/criador/notificacoes" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Avisos{" "}
            {naoLidas > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white align-middle"
                style={{ background: "var(--brass)" }}
              >
                {naoLidas}
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Cio, partos, mensagens, interessados e anúncios parados.
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
