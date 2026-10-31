import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { VerificacaoForm } from "@/components/verificacao-form";

export default async function VerificacaoPage() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Verificação do canil
      </h1>

      {canil.verificado ? (
        <div className="card mt-8 p-6">
          <p className="text-sm" style={{ color: "var(--pine)" }}>
            Seu canil já está verificado — seus anúncios publicados
            aparecem no marketplace.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Preencha os dados abaixo para entrar na fila de aprovação. Quanto
            mais completo, mais rápido costuma ser revisado.
          </p>
          {canil.solicitacaoVerificacaoEm && (
            <p className="mt-2 text-sm" style={{ color: "var(--brass)" }}>
              Última solicitação em {formatarData(canil.solicitacaoVerificacaoEm)} — ainda em análise.
            </p>
          )}

          <div className="card mt-6 p-6">
            <VerificacaoForm canil={canil} jaSolicitado={!!canil.solicitacaoVerificacaoEm} />
          </div>
        </>
      )}
    </main>
  );
}
