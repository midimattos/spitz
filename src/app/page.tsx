import Link from "next/link";
import { auth } from "@/lib/auth";

const SELOS_EXEMPLO = ["Canil verificado", "Pedigree anexado", "Exame de DNA", "Vacinas em dia"];

const CONFIANCA = [
  { titulo: "Canis verificados", texto: "Só canis aprovados pela plataforma anunciam no marketplace." },
  { titulo: "Ficha completa", texto: "Pedigree, DNA, vacinas e árvore genealógica à vista, antes de qualquer conversa." },
  { titulo: "Contato protegido", texto: "O contato é feito pela plataforma. Seu telefone só é liberado quando você quer." },
  { titulo: "Avaliação de quem comprou", texto: "Só compradores reais, depois de uma venda registrada, avaliam o canil." },
];

const PASSOS = [
  { n: "1", titulo: "Busque pelo que importa", texto: "Cor, marcação, diluição, merle, porte, valor e região. A busca ordena pelo que mais combina com você." },
  { n: "2", titulo: "Conheça o filhote de verdade", texto: "Fotos, linhagem, exames e histórico de saúde, com selos que mostram o que o canil comprovou." },
  { n: "3", titulo: "Feche com segurança", texto: "Contrato com garantia de saúde, certificado digital do filhote e avisos de vacina depois da compra." },
];

const RECURSOS = [
  { titulo: "Inteligência de mercado", texto: "O que os compradores procuram agora: cores em alta, regiões, faixas de valor e quanto tempo cada tipo de filhote leva para vender." },
  { titulo: "Precificação por cão", texto: "Preço sugerido para cada filhote com base em vendas, buscas e desejos reais, além de pedigree, exames e vacinas." },
  { titulo: "Plantel e genética", texto: "Árvore genealógica, genética de cor, dossiê genético e simulador de cruzamento, tudo no mesmo lugar." },
  { titulo: "Saúde da carteira", texto: "Vacinas e vermífugos vencendo, cios e partos previstos, com resumo semanal por e-mail." },
  { titulo: "Ninhadas e financeiro", texto: "Custo real por filhote, margem de cada ninhada, receitas, despesas e relatório anual para o contador." },
  { titulo: "Marca do seu canil", texto: "Página própria, certificado digital com QR code, álbum e cartaz para Stories, lista de espera e avaliações verificadas." },
];

export default async function HomePage() {
  const session = await auth();
  const painel = session?.user?.role === "ADMIN" ? "/admin" : session?.user?.role === "COMPRADOR" ? "/dashboard/comprador" : "/dashboard/criador";

  return (
    <main className="flex-1">
      {/* ---------- topo + hero ---------- */}
      <section style={{ background: "radial-gradient(1200px 500px at 85% 10%, #2b5242 0%, transparent 60%), linear-gradient(160deg, var(--pine) 0%, var(--pine-dark) 100%)", color: "#f6efe0" }}>
        <header className="max-w-6xl mx-auto px-6 sm:px-8 py-6 flex items-center justify-between">
          <span className="font-display text-xl tracking-wide">Spitz Alemão</span>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <Link href="/marketplace" className="hover:underline">Marketplace</Link>
            <a href="#criadores" className="hover:underline hidden sm:inline">Para criadores</a>
            {session?.user ? (
              <Link href={painel} className="px-4 py-2 rounded" style={{ background: "#e3c999", color: "#12241d" }}>Meu painel</Link>
            ) : (
              <>
                <Link href="/login" className="hover:underline">Entrar</Link>
                <Link href="/register" className="px-4 py-2 rounded" style={{ background: "#e3c999", color: "#12241d" }}>Cadastrar canil</Link>
              </>
            )}
          </nav>
        </header>

        <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-10 pb-20 sm:pt-16 sm:pb-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "#e3c999" }}>Marketplace do Spitz Alemão</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4">
              O filhote certo, de um canil que você pode conferir.
            </h1>
            <p className="mt-6 text-lg max-w-xl leading-relaxed" style={{ color: "rgba(246,239,224,0.85)" }}>
              Pedigree, exames e histórico completos em cada anúncio. Canis verificados, contato protegido e avaliações de quem realmente comprou.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/marketplace" className="px-7 py-3.5 rounded font-medium" style={{ background: "#e3c999", color: "#12241d" }}>
                Ver filhotes disponíveis
              </Link>
              <a href="#criadores" className="px-7 py-3.5 rounded border" style={{ borderColor: "rgba(246,239,224,0.45)" }}>
                Sou criador
              </a>
            </div>
            <p className="mt-5 text-xs" style={{ color: "rgba(246,239,224,0.6)" }}>
              O marketplace é aberto a todos, sem precisar de cadastro.
            </p>
          </div>

          {/* ficha de exemplo */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-xl p-5 shadow-2xl" style={{ background: "var(--parchment-card)", color: "var(--ink)", transform: "rotate(1.5deg)" }}>
              <div className="aspect-[4/3] rounded-lg flex items-end p-3" style={{ background: "linear-gradient(135deg, #e8d9b8 0%, #cfa56b 100%)" }}>
                <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.8)", color: "var(--pine)" }}>
                  Exemplo ilustrativo
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {SELOS_EXEMPLO.map((s) => (
                  <span key={s} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--pine)", color: "var(--pine)" }}>✓ {s}</span>
                ))}
              </div>
              <p className="font-display text-xl mt-3" style={{ color: "var(--pine)" }}>Filhote macho · Anão · Laranja</p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Pais com exame de DNA · COI calculado · Dossiê genético publicado</p>
              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: "var(--border-hairline)", color: "var(--ink-muted)" }}>
                <span>Certificado digital com QR code</span>
                <span style={{ color: "var(--brass)" }}>★ avaliação verificada</span>
              </div>
            </div>
            <div className="absolute -z-0 inset-0 rounded-xl border -rotate-3" style={{ borderColor: "rgba(227,201,153,0.4)" }} />
          </div>
        </div>
      </section>

      {/* ---------- confiança ---------- */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 -mt-10 relative z-10">
        <div className="card p-6 sm:p-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONFIANCA.map((c) => (
            <div key={c.titulo}>
              <p className="font-display text-lg" style={{ color: "var(--pine)" }}>{c.titulo}</p>
              <p className="text-sm mt-1.5 leading-snug" style={{ color: "var(--ink-muted)" }}>{c.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- compradores ---------- */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 pt-24">
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--brass)" }}>Para quem procura um filhote</p>
        <h2 className="font-display text-3xl sm:text-4xl mt-2 max-w-2xl" style={{ color: "var(--pine)" }}>
          Compre com informação, não com promessa.
        </h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {PASSOS.map((p) => (
            <div key={p.n} className="border-t-2 pt-5" style={{ borderColor: "var(--brass)" }}>
              <p className="font-display text-3xl" style={{ color: "var(--brass)" }}>{p.n}</p>
              <p className="font-display text-xl mt-2" style={{ color: "var(--pine)" }}>{p.titulo}</p>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--ink-muted)" }}>{p.texto}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link href="/marketplace" className="px-6 py-3 rounded text-white" style={{ background: "var(--pine)" }}>Explorar o marketplace</Link>
          <Link href="/register" className="text-sm underline" style={{ color: "var(--brass)" }}>
            Criar conta para ser avisado quando surgir o filhote que você procura
          </Link>
        </div>
      </section>

      {/* ---------- criadores ---------- */}
      <section id="criadores" className="mt-24 scroll-mt-4" style={{ background: "linear-gradient(180deg, var(--parchment-card) 0%, var(--parchment) 100%)", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)" }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-20">
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--brass)" }}>Para criadores</p>
          <h2 className="font-display text-3xl sm:text-4xl mt-2 max-w-3xl" style={{ color: "var(--pine)" }}>
            A gestão completa do canil, com inteligência de mercado.
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Do plantel à venda, tudo em um só lugar. E, a cada venda registrada na plataforma, os dados de mercado ficam mais precisos para todos os canis.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {RECURSOS.map((r) => (
              <div key={r.titulo} className="card p-6">
                <p className="font-display text-lg" style={{ color: "var(--pine)" }}>{r.titulo}</p>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--ink-muted)" }}>{r.texto}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-xl p-8 sm:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center" style={{ background: "var(--pine)", color: "#f6efe0" }}>
            <div>
              <p className="font-display text-2xl">Lançamento com canis convidados</p>
              <p className="mt-2 text-sm max-w-xl leading-relaxed" style={{ color: "rgba(246,239,224,0.82)" }}>
                Estamos abrindo a plataforma para um grupo de canis. Com um código de convite, seu canil já entra verificado. Sem convite, você entra na fila de aprovação.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="px-6 py-3 rounded font-medium" style={{ background: "#e3c999", color: "#12241d" }}>Cadastrar meu canil</Link>
              <Link href="/login" className="px-6 py-3 rounded border" style={{ borderColor: "rgba(246,239,224,0.45)" }}>Já tenho conta</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
