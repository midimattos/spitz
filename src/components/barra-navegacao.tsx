"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { paiDaRota, resolverContexto } from "@/lib/navegacao";

/**
 * Barra fixa no topo de todas as páginas (exceto a inicial de cada área):
 * "← Voltar" leva à página anterior e o link ao lado leva ao painel.
 * Fica no layout raiz, então não é preciso mexer página por página.
 */
export function BarraNavegacao() {
  const pathname = usePathname();
  const router = useRouter();

  const { homeHref, homeLabel, ehHome } = resolverContexto(pathname);
  if (ehHome) return null;

  function voltar() {
    // Com histórico, volta de verdade para a página anterior. Sem histórico
    // (link aberto direto numa aba nova), sobe para a página "pai".
    if (window.history.length > 1) router.back();
    else router.push(paiDaRota(pathname, homeHref));
  }

  return (
    <nav
      aria-label="Navegação"
      className="w-full max-w-6xl mx-auto px-8 pt-6 flex items-center gap-4 text-sm"
    >
      <button
        type="button"
        onClick={voltar}
        aria-label="Voltar para a página anterior"
        className="px-3 py-1.5 rounded border hover:opacity-80"
        style={{ borderColor: "var(--border-hairline)", color: "var(--pine)" }}
      >
        ← Voltar
      </button>
      <Link href={homeHref} className="hover:underline" style={{ color: "var(--ink-muted)" }}>
        {homeLabel}
      </Link>
    </nav>
  );
}
