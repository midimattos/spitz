import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { podeVerInteligenciaMercado, temPro } from "@/lib/recursos";
import { formatarData } from "@/lib/labels";

type Item = { href: string; titulo: string; texto: string; badge?: number | string | null; trava?: boolean };

function Destaque({ item }: { item: Item }) {
  return (
    <Link
      href={item.href}
      className="group relative block rounded-lg p-6 overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{ background: "linear-gradient(135deg, var(--pine) 0%, var(--pine-dark) 100%)", color: "#f6efe0", boxShadow: "0 6px 20px rgba(18,36,29,0.18)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "#e3c999" }}>
          {item.trava ? "Em breve para você" : "Diferencial da assinatura"}
        </p>
        {item.badge ? (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#e3c999", color: "#12241d" }}>{item.badge}</span>
        ) : null}
      </div>
      <h3 className="font-display text-xl mt-2">{item.titulo}</h3>
      <p className="mt-1.5 text-sm leading-snug" style={{ color: "rgba(246,239,224,0.82)" }}>{item.texto}</p>
      <p className="mt-4 text-sm" style={{ color: "#e3c999" }}>
        {item.trava ? "Saiba mais" : "Abrir"} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
      </p>
    </Link>
  );
}

function Compacto({ item }: { item: Item }) {
  return (
    <Link href={item.href} className="card block p-4 hover:opacity-95">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base" style={{ color: "var(--pine)" }}>{item.titulo}</h3>
        {item.badge ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full text-white" style={{ background: "var(--brass)" }}>{item.badge}</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-snug" style={{ color: "var(--ink-muted)" }}>{item.texto}</p>
    </Link>
  );
}

function Secao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-3 border-b pb-2" style={{ borderColor: "var(--border-hairline)" }}>
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>{titulo}</h2>
        {subtitulo && <p className="text-xs hidden sm:block" style={{ color: "var(--ink-muted)" }}>{subtitulo}</p>}
      </div>
      {children}
    </section>
  );
}

function Numero({ valor, rotulo, href }: { valor: number; rotulo: string; href: string }) {
  return (
    <Link href={href} className="card px-4 py-3 block hover:opacity-95">
      <p className="font-display text-2xl leading-none" style={{ color: "var(--pine)" }}>{valor}</p>
      <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{rotulo}</p>
    </Link>
  );
}

export default async function DashboardCriadorPage() {
  const session = await auth();
  const canil = await getCanilDoCriadorLogado();
  const radarLiberado = podeVerInteligenciaMercado(canil);

  const [naoLidas, caes, anunciosAtivos, semResposta, fila] = canil
    ? await Promise.all([
        session?.user ? prisma.notificacao.count({ where: { userId: session.user.id, lida: false } }) : 0,
        prisma.cao.count({ where: { canilId: canil.id, dataFalecimento: null } }),
        prisma.anuncio.count({ where: { canilId: canil.id, status: "PUBLICADO" } }),
        prisma.mensagemContato.count({ where: { anuncio: { canilId: canil.id }, respondidaEm: null } }),
        prisma.listaEspera.count({ where: { canilId: canil.id } }),
      ])
    : [0, 0, 0, 0, 0];

  const pro = temPro(canil);
  const gratisAte = canil?.proGratisAte && canil.proGratisAte.getTime() > Date.now() && !canil.assinaturaPro ? canil.proGratisAte : null;

  const destaques: Item[] = [
    { href: "/dashboard/criador/mercado", titulo: "Inteligência de Mercado", texto: "O que os compradores procuram agora: cores em alta, regiões, faixas de valor e tempo médio de venda.", trava: !radarLiberado },
    { href: "/dashboard/criador/precificacao", titulo: "Precificação", texto: "Quanto cobrar por cada cão, guiado por vendas e procura reais do marketplace." },
    { href: "/dashboard/criador/desempenho", titulo: "Desempenho", texto: "Seu canil comparado ao mercado, melhor época para cobrir e o perfil de quem compra." },
    { href: "/dashboard/criador/saude", titulo: "Saúde da carteira", texto: "Vacinas vencendo, cios e partos previstos, com resumo semanal por e-mail." },
  ];

  const diaADia: Item[] = [
    { href: "/dashboard/criador/plantel", titulo: "Plantel", texto: "Cães, árvore genealógica, dossiê genético e documentos." },
    { href: "/dashboard/criador/anuncios", titulo: "Anúncios", texto: "Publique filhotes no marketplace, com fotos e preço.", badge: anunciosAtivos ? `${anunciosAtivos} no ar` : null },
    { href: "/dashboard/criador/mensagens", titulo: "Mensagens", texto: "Interessados nos seus anúncios.", badge: semResposta ? `${semResposta} sem resposta` : null },
    { href: "/dashboard/criador/ninhadas", titulo: "Ninhadas", texto: "Coberturas, partos, custos, álbum e cartaz." },
    { href: "/dashboard/criador/financeiro", titulo: "Financeiro", texto: "Receitas, despesas, lucro e relatório anual." },
    { href: "/dashboard/criador/cuidados", titulo: "Cuidados", texto: "Vacinas, vermífugo e antipulgas, com aviso antes de vencer." },
  ];

  const marca: Item[] = [
    { href: "/dashboard/criador/perfil", titulo: "Página pública do canil", texto: "Seu endereço próprio, história, fotos e avaliações." },
    { href: "/dashboard/criador/lista-espera", titulo: "Lista de espera", texto: "Interessados avisados dos seus próximos filhotes.", badge: fila ? `${fila} na fila` : null },
    { href: "/dashboard/criador/convites", titulo: "Convites", texto: "Convide canis: 30 dias de PRO para vocês dois." },
  ];

  const ferramentas: Item[] = [
    { href: "/dashboard/criador/cruzamentos", titulo: "Simulador de cruzamento", texto: "Risco genético estimado e sugestões guiadas pela demanda." },
    { href: "/dashboard/criador/criopreservacao", titulo: "Criopreservação", texto: "Inventário de sêmen, embriões e óvulos." },
    { href: "/dashboard/criador/notificacoes", titulo: "Avisos", texto: "Cio, partos, mensagens e anúncios parados.", badge: naoLidas || null },
    { href: "/dashboard/criador/verificacao", titulo: "Dados e verificação", texto: canil?.verificado ? "Seu canil é verificado. Edite seus dados." : "Complete os dados e entre na fila de aprovação." },
  ];

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 sm:px-8 py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--brass)" }}>Painel do criador</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-1" style={{ color: "var(--pine)" }}>
            Olá, {session?.user?.name?.split(" ")[0]}
          </h1>
          {canil && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              {canil.nome}
              {canil.verificado ? " · canil verificado" : " · aguardando verificação"}
              {pro && !gratisAte ? " · assinatura ativa" : ""}
              {gratisAte ? ` · PRO grátis até ${formatarData(gratisAte)}` : ""}
            </p>
          )}
        </div>
        {canil?.verificado && (
          <Link href={`/${canil.slug}`} target="_blank" className="text-sm px-4 py-2 rounded border hover:opacity-80" style={{ borderColor: "var(--border-hairline)", color: "var(--pine)" }}>
            Ver minha página pública ↗
          </Link>
        )}
      </header>

      {canil && !canil.verificado && (
        <Link href="/dashboard/criador/verificacao" className="block mt-6 rounded-lg p-4 text-sm border" style={{ borderColor: "var(--brass)", background: "#f7ecd9", color: "var(--ink)" }}>
          <strong>Falta pouco:</strong> complete os dados do canil e solicite a verificação para anunciar no marketplace e ter sua página pública. <span style={{ color: "var(--brass)" }}>Completar agora →</span>
        </Link>
      )}

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Numero valor={caes} rotulo="cães no plantel" href="/dashboard/criador/plantel" />
        <Numero valor={anunciosAtivos} rotulo="anúncios no ar" href="/dashboard/criador/anuncios" />
        <Numero valor={semResposta} rotulo="mensagens sem resposta" href="/dashboard/criador/mensagens" />
        <Numero valor={naoLidas} rotulo="avisos novos" href="/dashboard/criador/notificacoes" />
      </div>

      <Secao titulo="Inteligência para vender melhor" subtitulo="O que só a plataforma entrega">
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          {destaques.map((i) => <Destaque key={i.href} item={i} />)}
        </div>
      </Secao>

      <Secao titulo="No dia a dia">
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {diaADia.map((i) => <Compacto key={i.href} item={i} />)}
        </div>
      </Secao>

      <Secao titulo="Sua marca e sua demanda">
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {marca.map((i) => <Compacto key={i.href} item={i} />)}
        </div>
      </Secao>

      <Secao titulo="Mais ferramentas">
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ferramentas.map((i) => <Compacto key={i.href} item={i} />)}
        </div>
      </Secao>

      <p className="mt-10 text-xs" style={{ color: "var(--ink-muted)" }}>
        Conectado como {session?.user?.email}
      </p>
    </main>
  );
}
