import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { formatarMoeda } from "@/lib/financeiro";
import { situacaoAssinatura, precoCheioMensal, PILOTO_DIAS } from "@/lib/assinatura";
import { AssinarButton } from "@/components/assinar-button";

export default async function AssinaturaPage() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;
  const s = situacaoAssinatura(canil);
  const cobrancaLigada = precoCheioMensal() !== null;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Minha assinatura
      </h1>

      <div className="card mt-8 p-6 space-y-3 text-sm">
        {s.ativoAte ? (
          <p>
            Acesso completo até <strong>{formatarData(s.ativoAte)}</strong> ({s.diasRestantes} dia{s.diasRestantes === 1 ? "" : "s"}).{" "}
            {canil.assinaturaPro ? "" : `O piloto dá ${PILOTO_DIAS} dias sem cobrança; depois todos pagam a mesma mensalidade.`}
          </p>
        ) : (
          <p>Seu período grátis terminou.</p>
        )}
        <p>
          Indicações com desconto: <strong>{canil.descontosIndicacao}</strong>
          <span style={{ color: "var(--ink-muted)" }}> · cada canil que você convida dá desconto na mensalidade seguinte.</span>
        </p>
        <p>
          Valor da próxima mensalidade:{" "}
          <strong>{s.valor === null ? "a definir" : formatarMoeda(s.valor)}</strong>
          {s.usaDesconto && s.preco !== null && (
            <span style={{ color: "var(--ink-muted)" }}> (de {formatarMoeda(s.preco)}, com {s.pct}% de desconto por indicação)</span>
          )}
        </p>
      </div>

      <div className="mt-6">
        {cobrancaLigada ? (
          <AssinarButton rotulo={s.ativoAte ? "Pagar a próxima mensalidade" : "Assinar agora"} />
        ) : (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            A cobrança ainda não começou. Você será avisado antes, e o piloto continua sem custo.
          </p>
        )}
      </div>
    </main>
  );
}
