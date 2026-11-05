import Link from "next/link";
import { existsSync } from "fs";
import { join } from "path";
import { auth } from "@/lib/auth";
import { planosDisponiveis, TESTE_DIAS } from "@/lib/assinatura";
import { cadastroAberto } from "@/lib/cadastro";
import { formatarMoeda } from "@/lib/financeiro";
import { MARKETPLACE_ATIVO } from "@/lib/marketplace-config";

const DESTAQUES_FICHA = ["Árvore genealógica até 5 gerações", "Genética de cor", "Vacinas em dia", "Dossiê digital"];

const RECURSOS = [
  { titulo: "Plantel e genealogia", texto: "Cadastre cada cão com foto, registro e microchip. A árvore genealógica vai até 5 gerações, com opções de impressão para o seu controle." },
  { titulo: "Genética de cor", texto: "Veja que cores cada cão carrega, simule cruzamentos e saiba antes o que pode nascer, com o risco genético estimado." },
  { titulo: "Ninhadas", texto: "Cobertura, data prevista do parto, filhotes, álbum de fotos e a margem de cada ninhada, do primeiro gasto à última venda." },
  { titulo: "Financeiro", texto: "Receitas, despesas, quanto cada cão custou e quanto rendeu, com relatório anual para o contador." },
  { titulo: "Saúde e cuidados", texto: "Vacinas, vermífugos e antipulgas com aviso antes de vencer, cios e partos previstos e resumo semanal por e-mail." },
  { titulo: "Marca do seu canil", texto: "Página própria com o endereço do seu canil, certificado digital com QR code, dossiê do cão e avaliações de quem já levou um filhote." },
];

const PASSOS = [
  { n: "1", titulo: "Cadastre o plantel", texto: "Seus reprodutores, filhotes e ancestrais. O sistema avisa se o mesmo cão for cadastrado duas vezes." },
  { n: "2", titulo: "Registre as ninhadas", texto: "Da cobertura ao parto, com data, pais, filhotes e custos de cada ninhada." },
  { n: "3", titulo: "Acompanhe o canil inteiro", texto: "Saúde, finanças e genealogia na mesma tela, sem caderninho nem planilha solta." },
];

export default async function HomePage() {
  const fotoIlustrativa = existsSync(join(process.cwd(), "public", "home", "cao-destaque.jpg")) ? "/home/cao-destaque.jpg" : null;
  const session = await auth();
  const logado = !!session?.user;
  const planos = planosDisponiveis();
  const aberto = cadastroAberto();
  const painel = session?.user?.role === "ADMIN" ? "/admin" : session?.user?.role === "COMPRADOR" ? "/dashboard/comprador" : "/dashboard/criador";

  return (
    <main className="flex-1">
      {/* ---------- topo + hero ---------- */}
      <section style={{ background: "radial-gradient(1200px 500px at 85% 10%, #2b5242 0%, transparent 60%), linear-gradient(160deg, var(--pine) 0%, var(--pine-dark) 100%)", color: "#f6efe0" }}>
        <header className="max-w-6xl mx-auto px-6 sm:px-8 py-6 flex items-center justify-between">
          <span className="font-display text-xl tracking-wide whitespace-nowrap">Spitz Alemão</span>
          <nav className="flex items-center gap-3 sm:gap-6 text-sm">
            {MARKETPLACE_ATIVO && <Link href="/marketplace" className="font-medium hover:underline">Marketplace</Link>}
            {logado && (
              <Link href={painel} className="px-4 py-2 rounded whitespace-nowrap" style={{ background: "#e3c999", color: "#12241d" }}>Meu painel</Link>
            )}
          </nav>
        </header>

        <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-10 pb-24 sm:pt-14 sm:pb-32 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "#e3c999" }}>Gestão de canil</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4">
              Todo o seu canil organizado em um só lugar.
            </h1>
            <p className="mt-6 text-lg max-w-xl leading-relaxed" style={{ color: "rgba(246,239,224,0.85)" }}>
              Plantel, genealogia, genética de cor, ninhadas, financeiro e saúde. Tudo o que hoje fica no caderno e na memória, registrado e fácil de achar.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {logado ? (
                <Link href={painel} className="inline-flex items-center gap-2 px-9 py-4 rounded-lg text-lg font-semibold shadow-lg hover:opacity-95" style={{ background: "#e3c999", color: "#12241d" }}>
                  Ir para o meu painel <span aria-hidden>→</span>
                </Link>
              ) : (
                <>
                  <Link href="/register?tipo=criador" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-semibold shadow-lg hover:opacity-95" style={{ background: "#e3c999", color: "#12241d" }}>
                    Criar conta do meu canil <span aria-hidden>→</span>
                  </Link>
                  <Link href="/login" className="inline-flex items-center px-8 py-4 rounded-lg text-lg border hover:opacity-90" style={{ borderColor: "rgba(246,239,224,0.55)" }}>
                    Já tenho conta
                  </Link>
                </>
              )}
            </div>
            {!logado && (
              <p className="mt-3 text-sm" style={{ color: "rgba(246,239,224,0.7)" }}>
                Acesso para canis convidados, com período grátis para conhecer tudo.
              </p>
            )}
          </div>

          {/* card ilustrativo: ficha de um cão do plantel */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-xl p-5 shadow-2xl" style={{ background: "var(--parchment-card)", color: "var(--ink)", transform: "rotate(1.5deg)" }}>
              <div
                className="aspect-[4/3] rounded-lg flex items-end p-3 bg-cover bg-center"
                style={{ background: fotoIlustrativa ? `url(${fotoIlustrativa}) center/cover` : "linear-gradient(135deg, #e8d9b8 0%, #cfa56b 100%)" }}
              >
                <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.85)", color: "var(--pine)" }}>
                  Exemplo ilustrativo
                </span>
              </div>
              <p className="font-display text-xl mt-4" style={{ color: "var(--pine)" }}>Ficha do cão no plantel</p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Macho · Anão · Laranja · Registro e microchip</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {DESTAQUES_FICHA.map((sel) => (
                  <span key={sel} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--pine)", color: "var(--pine)" }}>✓ {sel}</span>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: "var(--border-hairline)", color: "var(--ink-muted)" }}>
                <span>Certificado digital com QR code</span>
                <span style={{ color: "var(--brass)" }}>Árvore genealógica com opções de impressão</span>
              </div>
            </div>
            <div className="absolute -z-0 inset-0 rounded-xl border -rotate-3" style={{ borderColor: "rgba(227,201,153,0.4)" }} />
          </div>
        </div>
      </section>

      {/* ---------- recursos ---------- */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 pt-20">
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--brass)" }}>Para criadores</p>
        <h2 className="font-display text-3xl sm:text-4xl mt-2 max-w-3xl" style={{ color: "var(--pine)" }}>
          Controle de verdade sobre o seu canil.
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {RECURSOS.map((r) => (
            <div key={r.titulo} className="card p-6">
              <p className="font-display text-lg" style={{ color: "var(--pine)" }}>{r.titulo}</p>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--ink-muted)" }}>{r.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- como começar ---------- */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 pt-24">
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--brass)" }}>Como funciona</p>
        <h2 className="font-display text-3xl sm:text-4xl mt-2 max-w-2xl" style={{ color: "var(--pine)" }}>
          Comece pelo plantel e vá completando.
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
      </section>

      {/* ---------- preços ---------- */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 pt-24">
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--brass)" }}>Quanto custa</p>
        <h2 className="font-display text-3xl sm:text-4xl mt-2 max-w-3xl" style={{ color: "var(--pine)" }}>
          {TESTE_DIAS} dias grátis, com todas as funções.
        </h2>
        <p className="mt-3 text-sm max-w-2xl" style={{ color: "var(--ink-muted)" }}>
          Sem cartão para começar. Depois, escolha o plano: quanto mais longo, menor o valor por mês.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {planos.map((p) => (
            <div key={p.id} className="card p-6">
              <p className="font-display text-lg" style={{ color: "var(--pine)" }}>{p.rotulo}</p>
              <p className="text-3xl mt-2">{formatarMoeda(p.preco)}</p>
              {p.meses > 1 && (
                <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                  {formatarMoeda(p.porMes)} por mês{p.economiaPercent > 0 ? ` · economia de ${p.economiaPercent}%` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
          {aberto ? "Cadastro aberto." : "Cadastro por convite neste momento: peça o código a um canil parceiro."}
        </p>
      </section>

      {/* ---------- convite ---------- */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 py-24">
        <div className="rounded-xl p-8 sm:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center" style={{ background: "var(--pine)", color: "#f6efe0" }}>
          <div>
            <p className="font-display text-2xl">Lançamento com canis convidados</p>
            <p className="mt-2 text-sm max-w-xl leading-relaxed" style={{ color: "rgba(246,239,224,0.82)" }}>
              Estamos abrindo a plataforma para um grupo de canis selecionados. Com um código de convite, seu canil já entra verificado. Sem convite, você entra na fila de aprovação.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {logado ? (
              <Link href={painel} className="px-6 py-3 rounded font-medium" style={{ background: "#e3c999", color: "#12241d" }}>Ir para o meu painel</Link>
            ) : (
              <>
                <Link href="/register?tipo=criador" className="px-6 py-3 rounded font-medium" style={{ background: "#e3c999", color: "#12241d" }}>Cadastrar meu canil</Link>
                <Link href="/login" className="px-6 py-3 rounded border" style={{ borderColor: "rgba(246,239,224,0.45)" }}>Entrar</Link>
              </>
            )}
          </div>
        </div>
        {MARKETPLACE_ATIVO && (
          <p className="mt-6 text-sm text-center" style={{ color: "var(--ink-muted)" }}>
            Procurando um filhote?{" "}
            <Link href="/marketplace" className="underline" style={{ color: "var(--brass)" }}>Veja os filhotes no marketplace</Link>
          </p>
        )}
      </section>
    </main>
  );
}
