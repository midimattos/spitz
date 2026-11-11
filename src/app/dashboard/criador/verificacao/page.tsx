import Link from "next/link";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { VerificacaoForm } from "@/components/verificacao-form";

export default async function VerificacaoPage() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Dados do canil
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        O nome do canil é diferente do seu nome pessoal, que se altera em{" "}
        <Link href="/conta" className="underline" style={{ color: "var(--brass)" }}>Minha conta</Link>.
      </p>

      {canil.verificado ? (
        <p className="mt-3 text-sm" style={{ color: "var(--pine)" }}>
          Seu canil já está verificado — sua página pública mostra o selo de canil verificado.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Preencha os dados abaixo para entrar na fila de aprovação. Quanto mais completo, mais rápido costuma ser revisado.
          </p>
          {canil.solicitacaoVerificacaoEm && (
            <p className="mt-2 text-sm" style={{ color: "var(--brass)" }}>
              Última solicitação em {formatarData(canil.solicitacaoVerificacaoEm)} — ainda em análise.
            </p>
          )}
        </>
      )}

      <div className="card mt-6 p-6">
        <VerificacaoForm canil={canil} jaSolicitado={!!canil.solicitacaoVerificacaoEm} verificado={canil.verificado} />
      </div>
    </main>
  );
}
