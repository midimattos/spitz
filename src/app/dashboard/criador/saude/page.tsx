import Link from "next/link";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { montarRelatorioSaude, textoRelatorioSaude } from "@/lib/relatorio-saude";
import { formatarData } from "@/lib/labels";
import { AvisoSemanalToggle } from "@/components/aviso-semanal-toggle";

const TIPO: Record<string, string> = { VACINA: "Vacina", VERMIFUGO: "Vermífugo", ANTIPULGAS: "Antipulgas", CONSULTA: "Consulta", OUTRO: "Cuidado" };

function Bloco({ titulo, vazio, children, vazioAtivo }: { titulo: string; vazio: string; vazioAtivo: boolean; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>{titulo}</h2>
      {vazioAtivo ? <p className="text-sm mt-3" style={{ color: "var(--ink-muted)" }}>{vazio}</p> : <ul className="mt-3 divide-y text-sm" style={{ borderColor: "var(--border-hairline)" }}>{children}</ul>}
    </section>
  );
}

export default async function SaudeCarteiraPage() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;
  const r = await montarRelatorioSaude(canil.id);
  const texto = textoRelatorioSaude(r, canil.nome);
  const tel = (canil.telefoneContato ?? "").replace(/\D/g, "");
  const wa = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
  const quando = (dias: number) => (dias < 0 ? `venceu há ${-dias} dia${dias < -1 ? "s" : ""}` : dias === 0 ? "hoje" : `em ${dias} dia${dias > 1 ? "s" : ""}`);
  const li = "py-2 flex justify-between gap-4";

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Saúde da carteira</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            O que vence, quem entra no cio e quais partos se aproximam, para todos os cães do plantel.
          </p>
        </div>
        <a href={wa} target="_blank" rel="noreferrer" className="px-4 py-2 rounded text-white text-sm" style={{ background: "var(--pine)" }}>
          Enviar resumo no WhatsApp
        </a>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mt-6">
        {[
          ["Atrasados", r.atrasados.length, r.atrasados.length ? "#a32d2d" : "var(--pine)"],
          ["Vencem em 30 dias", r.vencendo.length, "var(--pine)"],
          ["Cios previstos", r.cios.length, "var(--pine)"],
          ["Partos previstos", r.partos.length, "var(--pine)"],
        ].map(([t, v, c]) => (
          <div key={t as string} className="card p-4 text-center">
            <p className="font-display text-3xl" style={{ color: c as string }}>{v}</p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{t}</p>
          </div>
        ))}
      </div>

      <div className="space-y-5 mt-6">
        <Bloco titulo="Atrasados" vazio="Nada atrasado. 👏" vazioAtivo={r.atrasados.length === 0}>
          {r.atrasados.map((i, k) => (
            <li key={k} className={li}>
              <span>{TIPO[i.tipo]} {i.nome} · <Link href={`/dashboard/criador/plantel/${i.caoId}`} className="underline">{i.caoNome}</Link></span>
              <span style={{ color: "#a32d2d" }}>{quando(i.dias)}</span>
            </li>
          ))}
        </Bloco>
        <Bloco titulo="Vencem nos próximos 30 dias" vazio="Nenhum vencimento próximo." vazioAtivo={r.vencendo.length === 0}>
          {r.vencendo.map((i, k) => (
            <li key={k} className={li}>
              <span>{TIPO[i.tipo]} {i.nome} · <Link href={`/dashboard/criador/plantel/${i.caoId}`} className="underline">{i.caoNome}</Link></span>
              <span style={{ color: "var(--ink-muted)" }}>{formatarData(i.data)} · {quando(i.dias)}</span>
            </li>
          ))}
        </Bloco>
        <Bloco titulo="Cios previstos (45 dias)" vazio="Nenhum cio previsto. Registre os ciclos na ficha das matrizes." vazioAtivo={r.cios.length === 0}>
          {r.cios.map((i) => (
            <li key={i.caoId} className={li}>
              <Link href={`/dashboard/criador/plantel/${i.caoId}`} className="underline">{i.caoNome}</Link>
              <span style={{ color: "var(--ink-muted)" }}>{formatarData(i.data)}{i.estimado ? " · estimativa" : ""}</span>
            </li>
          ))}
        </Bloco>
        <Bloco titulo="Partos previstos" vazio="Nenhum parto previsto." vazioAtivo={r.partos.length === 0}>
          {r.partos.map((i) => (
            <li key={i.ninhadaId} className={li}>
              <Link href="/dashboard/criador/ninhadas" className="underline">{i.maeNome}</Link>
              <span style={{ color: i.dias < 0 ? "#a32d2d" : "var(--ink-muted)" }}>{formatarData(i.data)}{i.dias < 0 ? " · atrasado" : ""}</span>
            </li>
          ))}
        </Bloco>
        {r.semVacina.length > 0 && (
          <p className="text-sm card p-4" style={{ color: "var(--brass)" }}>
            Sem nenhuma vacina registrada: {r.semVacina.map((s) => s.caoNome).join(", ")}. Registre em{" "}
            <Link href="/dashboard/criador/cuidados" className="underline">Cuidados</Link>.
          </p>
        )}
      </div>

      <div className="mt-8">
        <AvisoSemanalToggle inicial={canil.avisoSemanal} />
        <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
          O WhatsApp abre com o texto pronto para você enviar a si mesmo ou à equipe. O envio automático por WhatsApp exige um serviço pago de terceiros.
        </p>
      </div>
    </main>
  );
}
