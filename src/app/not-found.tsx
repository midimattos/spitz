import Link from "next/link";
import { MARKETPLACE_ATIVO } from "@/lib/marketplace-config";

export default function NaoEncontrada() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="text-center max-w-md">
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--brass)" }}>Erro 404</p>
        <h1 className="font-display text-3xl mt-2" style={{ color: "var(--pine)" }}>Página não encontrada</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>O endereço pode ter mudado ou não existe mais.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={MARKETPLACE_ATIVO ? "/marketplace" : "/"} className="px-5 py-2 rounded text-white" style={{ background: "var(--pine)" }}>{MARKETPLACE_ATIVO ? "Ver o marketplace" : "Ir para o início"}</Link>
          <Link href="/" className="px-5 py-2 rounded border" style={{ borderColor: "var(--border-hairline)" }}>Página inicial</Link>
        </div>
      </div>
    </main>
  );
}
