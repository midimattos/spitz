import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { ContaNome } from "@/components/conta-nome";
import { ContaEmail, ContaWhatsapp } from "@/components/conta-contato";
import { formatarCelular, whatsappConfigurado } from "@/lib/whatsapp";

export const metadata = { title: "Minha conta | Plataforma Spitz Alemão" };

export default async function MinhaContaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/conta");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  const canil = user.role === "CRIADOR" ? await getCanilDoCriadorLogado() : null;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-6 sm:px-8 py-12">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Minha conta</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>{user.name}</p>

      <section className="card mt-8 p-6">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>Seus dados</h2>
        <div className="mt-4">
          <ContaNome nome={user.name} />
        </div>
        {canil && (
          <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nome do canil: <strong style={{ color: "var(--ink)" }}>{canil.nome}</strong>{" "}
            <Link href="/dashboard/criador/verificacao" className="underline" style={{ color: "var(--brass)" }}>alterar em Dados do canil</Link>
          </p>
        )}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>Confirmação de contato</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          Confirmar e-mail e WhatsApp protege a plataforma contra perfis falsos e garante que os dados de mercado reflitam vendas reais. Cada número de WhatsApp só pode ser usado em uma conta.
        </p>
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)" }}>E-mail</p>
            <ContaEmail email={user.email} confirmado={!!user.emailVerified} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)" }}>WhatsApp</p>
            <ContaWhatsapp
              verificado={!!user.whatsappVerificadoEm}
              numeroAtual={user.whatsapp ? formatarCelular(user.whatsapp) : null}
              pendente={user.whatsappPendente ? formatarCelular(user.whatsappPendente) : null}
              automatico={whatsappConfigurado()}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
