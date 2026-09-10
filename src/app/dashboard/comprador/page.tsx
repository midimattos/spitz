import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function DashboardCompradorPage() {
  const session = await auth();

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Olá, {session?.user?.name}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
        Painel do comprador.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <Link href="/marketplace" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Marketplace
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Veja filhotes disponíveis de canis verificados.
          </p>
        </Link>

        <Link href="/dashboard/comprador/radar" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Radar de demanda
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Diga o que você procura e seja avisado quando aparecer algo
            compatível.
          </p>
        </Link>
      </div>
    </main>
  );
}
