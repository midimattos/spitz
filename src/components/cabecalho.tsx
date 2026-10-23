"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  usuario: { nome: string; papel: string } | null;
  sair: () => Promise<void>;
};

const SEM_CABECALHO = ["/", "/login", "/register"];

/** Cabeçalho global: marca, atalho para o painel e botão de sair da conta. */
export function Cabecalho({ usuario, sair }: Props) {
  const pathname = usePathname();
  if (SEM_CABECALHO.includes(pathname)) return null;

  const painel =
    usuario?.papel === "ADMIN" ? "/admin" : usuario?.papel === "COMPRADOR" ? "/dashboard/comprador" : "/dashboard/criador";

  return (
    <header className="w-full border-b" style={{ borderColor: "var(--border-hairline)", background: "var(--parchment-card)" }}>
      <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
        <Link href="/" className="font-display text-lg tracking-wide" style={{ color: "var(--pine)" }}>
          Spitz Alemão
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/marketplace" className="hover:underline" style={{ color: "var(--ink)" }}>
            Marketplace
          </Link>
          {usuario ? (
            <>
              <Link href={painel} className="hover:underline" style={{ color: "var(--ink)" }}>
                Meu painel
              </Link>
              <span className="hidden sm:inline" style={{ color: "var(--ink-muted)" }}>
                {usuario.nome}
              </span>
              <form action={sair}>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded border text-sm hover:opacity-80"
                  style={{ borderColor: "var(--border-hairline)", color: "var(--pine)" }}
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="px-3 py-1.5 rounded text-white" style={{ background: "var(--pine)" }}>
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
