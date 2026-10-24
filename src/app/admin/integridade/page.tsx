import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { carregarParaAnalise, detectarSuspeitas, vendaEntraNoMercado, MODO_ESTRITO } from "@/lib/integridade";
import { AdminVendaAcoes } from "@/components/admin-venda-acoes";
import { formatarData } from "@/lib/labels";
import { formatarMoeda } from "@/lib/financeiro";

const ROTULO: Record<string, string> = {
  CONTRATO: "contrato aceito",
  AVALIACAO: "avaliação",
  COMPRADOR: "comprador confirmou",
  ADMIN: "confirmada pelo admin",
  MESMA_REDE: "aceite na mesma rede (não conta)",
  NEGADA: "comprador negou",
};

export default async function IntegridadePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") notFound();

  const analise = await carregarParaAnalise();
  const sus = detectarSuspeitas(analise);
  const vendas = await prisma.vendaRegistro.findMany({ include: { canil: { select: { nome: true } } }, orderBy: { criadoEm: "desc" }, take: 300 });
  const porId = new Map(analise.map((a) => [a.id, a]));

  const canis = new Map<string, { nome: string; declaradas: number; confirmadas: number; suspeitas: number }>();
  for (const v of vendas) {
    const c = canis.get(v.canilId) ?? { nome: v.canil.nome, declaradas: 0, confirmadas: 0, suspeitas: 0 };
    c.declaradas++;
    if (v.confirmadaEm && !v.excluida) c.confirmadas++;
    if (sus.has(v.id)) c.suspeitas++;
    canis.set(v.canilId, c);
  }

  const suspeitas = vendas.filter((v) => sus.has(v.id));
  const totalNoMercado = analise.filter((a) => vendaEntraNoMercado(a, sus.get(a.id))).length;

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 sm:px-8 py-12">
      <Link href="/admin" className="text-sm underline" style={{ color: "var(--brass)" }}>← Admin</Link>
      <h1 className="font-display text-3xl mt-2" style={{ color: "var(--pine)" }}>Integridade dos dados de mercado</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        {analise.length} venda(s) declarada(s) · {totalNoMercado} entram nos números de mercado · modo {MODO_ESTRITO ? "estrito (só confirmadas)" : "padrão (confirmadas + não suspeitas)"}.
        Venda confirmada é um sinal, não uma prova: o comprador pode ser alguém ligado ao canil. Por isso cada canil pesa um voto nos cálculos.
      </p>

      <section className="card mt-8 p-6">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Por canil</h2>
        <table className="w-full text-sm mt-3">
          <thead><tr className="text-left" style={{ color: "var(--ink-muted)" }}><th className="py-1">Canil</th><th>Declaradas</th><th>Confirmadas</th><th>Suspeitas</th></tr></thead>
          <tbody>
            {[...canis.values()].map((c) => (
              <tr key={c.nome} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                <td className="py-1.5">{c.nome}</td><td>{c.declaradas}</td><td>{c.confirmadas}</td><td style={{ color: c.suspeitas ? "#a32d2d" : undefined }}>{c.suspeitas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Vendas com sinais de suspeita ({suspeitas.length})</h2>
        {suspeitas.length === 0 ? (
          <p className="text-sm mt-2" style={{ color: "var(--ink-muted)" }}>Nenhuma por enquanto.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {suspeitas.map((v) => {
              const s = sus.get(v.id)!;
              const a = porId.get(v.id)!;
              return (
                <div key={v.id} className="card p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <p><strong>{v.canil.nome}</strong> · {formatarMoeda(Number(v.precoFinal))} · {formatarData(v.dataVenda)}{v.excluida ? " · EXCLUÍDA" : ""}</p>
                    <AdminVendaAcoes vendaId={v.id} excluida={v.excluida} confirmada={a.confirmada} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                    Comprador: {v.compradorNome ?? "—"} · {v.compradorEmail ?? "sem e-mail"} · {v.compradorTelefone ?? "sem celular"} · {v.confirmacao ? ROTULO[v.confirmacao] ?? v.confirmacao : "não confirmada"}
                  </p>
                  <ul className="mt-2 text-xs list-disc pl-5">
                    {s.graves.map((m) => <li key={m} style={{ color: "#a32d2d" }}>{m} (fora dos números enquanto não confirmada)</li>)}
                    {s.leves.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
