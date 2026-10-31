import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { provedorAtivo, MODELO_GEMINI } from "@/lib/ia";
import { MODELO_IA } from "@/lib/anthropic";
import { AdminTestarIA } from "@/components/admin-testar-ia";

export const dynamic = "force-dynamic";

export default async function IAPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") notFound();
  const ativo = provedorAtivo();
  const linhas: [string, boolean][] = [
    ["ANTHROPIC_API_KEY", !!process.env.ANTHROPIC_API_KEY],
    ["GEMINI_API_KEY", !!process.env.GEMINI_API_KEY],
  ];

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 sm:px-8 py-12">
      <Link href="/admin" className="text-sm underline" style={{ color: "var(--brass)" }}>← Admin</Link>
      <h1 className="font-display text-3xl mt-2" style={{ color: "var(--pine)" }}>Leitura de pedigree por IA</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Confira a configuração e teste a conexão antes de ler um pedigree. O teste é só de texto e custa uma fração de centavo. Os valores das chaves nunca são exibidos.
      </p>

      <div className="card mt-6 p-6">
        <table className="w-full text-sm">
          <tbody>
            {linhas.map(([nome, ok]) => (
              <tr key={nome} className="border-t first:border-t-0" style={{ borderColor: "var(--border-hairline)" }}>
                <td className="py-1.5 font-mono text-xs">{nome}</td>
                <td style={{ color: ok ? "var(--pine)" : "var(--ink-muted)" }}>{ok ? "definida" : "não definida"}</td>
              </tr>
            ))}
            <tr className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
              <td className="py-1.5">Provedor em uso</td>
              <td>{ativo ?? "nenhum"}{ativo ? ` (${ativo === "gemini" ? MODELO_GEMINI : MODELO_IA})` : ""}</td>
            </tr>
          </tbody>
        </table>
        {ativo === "gemini" && (
          <p className="mt-4 text-xs" style={{ color: "#a06a2e" }}>
            Gemini gratuito: use só para teste. O plano gratuito pode usar o conteúdo enviado para melhorar produtos do Google. Para clientes reais, use um plano pago.
          </p>
        )}
        <div className="mt-6">
          <AdminTestarIA />
        </div>
      </div>
    </main>
  );
}
