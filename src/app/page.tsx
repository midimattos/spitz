import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1">
      <header className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto w-full">
        <span className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Spitz Alemão
        </span>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/marketplace" className="hover:underline">
            Marketplace
          </Link>
          <Link href="/login" className="hover:underline">
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded text-sm text-white"
            style={{ background: "var(--pine)" }}
          >
            Cadastrar canil
          </Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-8 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm tracking-widest uppercase" style={{ color: "var(--brass)" }}>
            Marketplace e SaaS de canil
          </p>
          <h1 className="font-display text-5xl leading-tight mt-3" style={{ color: "var(--ink)" }}>
            O pedigree do seu canil, verificado e vendido com dados.
          </h1>
          <p className="mt-6 text-lg" style={{ color: "var(--ink-muted)" }}>
            Vitrine gratuita para compradores. Genética, precificação e dossiê
            digital para criadores que querem vender mais rápido e mais caro.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/register"
              className="px-6 py-3 rounded text-white"
              style={{ background: "var(--pine)" }}
            >
              Sou criador
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded border"
              style={{ borderColor: "var(--border-hairline)" }}
            >
              Quero um filhote
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <div
            className="seal w-56 h-56 flex items-center justify-center text-center p-8"
            style={{ color: "var(--pine)" }}
          >
            <span className="font-display text-sm leading-snug">
              Dossiê genético
              <br />
              verificado
            </span>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 pb-24 grid sm:grid-cols-3 gap-6">
        {[
          {
            titulo: "Radar de demanda",
            texto: "Saiba o que o mercado quer antes de planejar a próxima ninhada.",
          },
          {
            titulo: "Precificação dinâmica",
            texto: "Preço sugerido com base em raridade, dossiê e demanda real.",
          },
          {
            titulo: "Dossiê genético",
            texto: "Laudos padronizados, COI calculado e selo de verificação.",
          },
        ].map((item) => (
          <div key={item.titulo} className="card p-6">
            <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
              {item.titulo}
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
              {item.texto}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
