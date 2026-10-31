import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardCompradorPage() {
  const session = await auth();
  const [desejo, naoLidas] = session?.user
    ? await Promise.all([
        prisma.desejoComprador.findUnique({ where: { userId: session.user.id }, select: { validacao: true } }),
        prisma.notificacao.count({ where: { userId: session.user.id, lida: false } }),
      ])
    : [null, 0];

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Olá, {session?.user?.name}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
        Painel do comprador.
      </p>

      {desejo?.validacao === "PENDENTE" && (
        <p className="mt-6 text-sm card p-4" style={{ color: "var(--brass)" }}>
          Seu cadastro no radar está em validação pela equipe (proteção contra golpes para os criadores). Você já
          pode navegar e favoritar; o contato com criadores é liberado assim que for aprovado.
        </p>
      )}
      {desejo?.validacao === "REJEITADO" && (
        <p className="mt-6 text-sm card p-4" style={{ color: "#a32d2d" }}>
          Seu cadastro no radar não foi aprovado. Se acha que houve engano, fale com a equipe da plataforma.
        </p>
      )}

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

        <Link href="/dashboard/comprador/favoritos" className="card p-6 hover:opacity-90">
          <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Favoritos
          </h3>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Os filhotes que você marcou no marketplace.
          </p>
        </Link>

        <Link href="/dashboard/comprador/notificacoes" className="card p-6 hover:opacity-90">
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
            Aprovação do cadastro e respostas dos criadores.
          </p>
        </Link>
      </div>
    </main>
  );
}
