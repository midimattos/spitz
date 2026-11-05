import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { formatarMoeda } from "@/lib/financeiro";
import { situacaoAssinatura, valorDoPlano, cobrancaAtiva, TESTE_DIAS, DIAS_TOLERANCIA } from "@/lib/assinatura";
import { AssinarButton } from "@/components/assinar-button";
import { CancelarRenovacao } from "@/components/cancelar-renovacao";
import { provedorDePagamento } from "@/lib/asaas";

export default async function AssinaturaPage({ searchParams }: { searchParams: Promise<{ pagamento?: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;
  const { pagamento } = await searchParams;
  const s = situacaoAssinatura(canil);
  const cobranca = cobrancaAtiva();

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 sm:px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Minha assinatura</h1>

      {pagamento === "processando" && (
        <p className="mt-4 text-sm card p-4">Pagamento recebido. A confirmação pode levar alguns minutos; o acesso é estendido assim que o Mercado Pago aprovar.</p>
      )}
      {pagamento === "falhou" && (
        <p className="mt-4 text-sm card p-4" style={{ color: "#a32d2d" }}>O pagamento não foi concluído. Você pode tentar de novo.</p>
      )}

      <div className="card mt-8 p-6 space-y-3 text-sm">
        {canil.assinaturaPro ? (
          <p>Assinatura ativa, sem data de vencimento.</p>
        ) : s.ativo ? (
          <p>
            Acesso completo até <strong>{formatarData(s.fim)}</strong> ({s.diasRestantes} dia{s.diasRestantes === 1 ? "" : "s"}).
            {" "}Todo canil novo ganha {TESTE_DIAS} dias grátis com todas as funções.
          </p>
        ) : s.emTolerancia ? (
          <p>Seu acesso venceu em <strong>{formatarData(s.fim)}</strong>. Você ainda tem uns dias de tolerância para assinar sem perder nada.</p>
        ) : (
          <p>
            Seu acesso venceu em <strong>{formatarData(s.fim)}</strong>. Seus dados estão guardados e você continua vendo tudo;
            para voltar a cadastrar e editar, escolha um plano.
          </p>
        )}
        <p>
          Indicações com desconto: <strong>{canil.descontosIndicacao}</strong>
          <span style={{ color: "var(--ink-muted)" }}> · vale na mensalidade do plano de 1 mês.</span>
        </p>
      </div>

      {canil.asaasSubscriptionId && (
        <div className="card mt-6 p-5 text-sm space-y-3">
          <p>Renovação automática no cartão <strong>ativa</strong>. A cobrança acontece sozinha a cada ciclo do seu plano.</p>
          <CancelarRenovacao />
        </div>
      )}

      {cobranca && !canil.asaasSubscriptionId ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {s.planos.map((p) => {
            const v = valorDoPlano(p, provedorDePagamento() === "asaas" ? { descontosIndicacao: 0 } : canil);
            return (
              <div key={p.id} className="card p-5 space-y-2">
                <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>{p.rotulo}</h2>
                <p className="text-2xl">{formatarMoeda(v.valor)}</p>
                {v.usaDesconto && (
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>de {formatarMoeda(v.valorCheio)}, com {v.pct}% de desconto por indicação</p>
                )}
                {p.meses > 1 && (
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {formatarMoeda(p.porMes)} por mês{p.economiaPercent > 0 ? ` · economia de ${p.economiaPercent}%` : ""}
                  </p>
                )}
                <AssinarButton plano={p.id} rotulo={`Assinar ${p.rotulo.toLowerCase()}`} destaque={p.id === "TRIMESTRAL"} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm" style={{ color: "var(--ink-muted)" }}>
          A cobrança ainda não começou. Você será avisado antes e nada muda no seu acesso até lá.
        </p>
      )}
      <p className="mt-6 text-xs" style={{ color: "var(--ink-muted)" }}>
        Pagamento pelo Mercado Pago (Pix, cartão ou boleto). Cada pagamento soma os meses do plano ao seu acesso atual.
        Tolerância após o vencimento: {DIAS_TOLERANCIA} dias.
      </p>
    </main>
  );
}
