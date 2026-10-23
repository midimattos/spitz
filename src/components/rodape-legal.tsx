import Link from "next/link";

export function RodapeLegal() {
  return (
    <footer
      className="w-full max-w-6xl mx-auto px-8 py-6 text-xs flex flex-wrap gap-x-6 gap-y-1"
      style={{ color: "var(--ink-muted)" }}
    >
      <span>© {new Date().getFullYear()} Plataforma Spitz Alemão</span>
      <Link href="/termos" className="hover:underline">
        Termos de uso
      </Link>
      <Link href="/privacidade" className="hover:underline">
        Política de privacidade
      </Link>
    </footer>
  );
}
