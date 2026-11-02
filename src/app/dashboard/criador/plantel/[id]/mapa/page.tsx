import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { caminhosDaGeracao, rotuloCaminho } from "@/lib/arvore-nos";
import { ImprimirButton } from "@/components/imprimir-button";

type No = {
  id: string;
  nome: string;
  sexo: "MACHO" | "FEMEA";
  fotoUrl: string | null;
  corPelagem: string | null;
  corBase: string | null;
  registro: string | null;
  canilOrigem: string | null;
  externo: boolean;
  dataNascimento: Date | null;
  paiId: string | null;
  maeId: string | null;
};

function Celula({ no, rotulo, mostrarRegistro, grande }: { no: No | null; rotulo: string; mostrarRegistro: boolean; grande?: boolean }) {
  const cor = no?.corPelagem || no?.corBase;
  return (
    <div
      className="h-full rounded border flex items-center gap-2 p-1.5 overflow-hidden"
      style={{ borderColor: "var(--border-hairline)", background: no ? "#fff" : "transparent", borderStyle: no ? "solid" : "dashed" }}
    >
      {no?.fotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={no.fotoUrl} alt="" className="shrink-0 rounded object-cover" style={{ width: grande ? 72 : 40, height: grande ? 72 : 40 }} />
      )}
      <div className="min-w-0 leading-tight">
        <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
          {rotulo}
        </p>
        {no ? (
          <>
            <p className={grande ? "text-base font-medium" : "text-xs font-medium"} style={{ color: "var(--pine)" }}>
              {no.nome}
            </p>
            {cor && <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>{cor}</p>}
            {no.canilOrigem && <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Canil {no.canilOrigem}</p>}
            {mostrarRegistro && no.registro && <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Reg. {no.registro}</p>}
          </>
        ) : (
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>—</p>
        )}
      </div>
    </div>
  );
}

export default async function MapaGenealogicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ g?: string; registro?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const canil = await getCanilDoCriadorLogado();
  if (!canil) notFound();

  const todos = (await prisma.cao.findMany({
    where: { canilId: canil.id },
    select: { id: true, nome: true, sexo: true, fotoUrl: true, corPelagem: true, corBase: true, registro: true, canilOrigem: true, externo: true, dataNascimento: true, paiId: true, maeId: true },
  })) as No[];
  const porId = new Map(todos.map((c) => [c.id, c]));
  const cao = porId.get(id);
  if (!cao) notFound();

  const G = Math.min(5, Math.max(2, Number(sp.g) || 4));
  const mostrarRegistro = sp.registro === "1";
  const linhas = 2 ** G;

  const noDe = (caminho: string): No | null => {
    let atual: No | null = cao;
    for (const letra of caminho) {
      if (!atual) return null;
      const alvo: string | null = letra === "p" ? atual.paiId : atual.maeId;
      atual = alvo ? porId.get(alvo) ?? null : null;
    }
    return atual;
  };

  const base = `/dashboard/criador/plantel/${cao.id}/mapa`;
  const hoje = formatarData(new Date());

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <div className="nao-imprimir flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link href={`/dashboard/criador/plantel/${cao.id}`} className="text-sm underline" style={{ color: "var(--ink-muted)" }}>
          ← Voltar para a ficha
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[3, 4, 5].map((n) => (
            <Link
              key={n}
              href={`${base}?g=${n}${mostrarRegistro ? "&registro=1" : ""}`}
              className="px-3 py-1.5 rounded border"
              style={{ borderColor: n === G ? "var(--pine)" : "var(--border-hairline)", background: n === G ? "var(--pine)" : "transparent", color: n === G ? "white" : "var(--ink)" }}
            >
              {n} gerações
            </Link>
          ))}
          <Link
            href={`${base}?g=${G}${mostrarRegistro ? "" : "&registro=1"}`}
            className="px-3 py-1.5 rounded border"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            {mostrarRegistro ? "Ocultar registros" : "Mostrar registros"}
          </Link>
          <ImprimirButton />
        </div>
      </div>

      <header className="mb-4 text-center">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--brass)" }}>
          Mapa genealógico
        </p>
        <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
          {cao.nome}
        </h1>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          {canil.nome}
          {cao.dataNascimento ? ` · nascido em ${formatarData(cao.dataNascimento)}` : ""}
        </p>
      </header>

      <div className="overflow-x-auto">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${G + 1}, minmax(150px, 1fr))`, gridTemplateRows: `repeat(${linhas}, minmax(52px, auto))`, minWidth: (G + 1) * 150 }}
        >
          <div style={{ gridColumn: 1, gridRow: `1 / span ${linhas}` }}>
            <div className="h-full flex flex-col items-center justify-center rounded border p-3 text-center" style={{ borderColor: "var(--pine)" }}>
              {cao.fotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cao.fotoUrl} alt="" className="w-full max-w-[160px] aspect-square object-cover rounded mb-2" />
              )}
              <p className="font-display text-lg" style={{ color: "var(--pine)" }}>{cao.nome}</p>
              {(cao.corPelagem || cao.corBase) && <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{cao.corPelagem || cao.corBase}</p>}
              {mostrarRegistro && cao.registro && <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Reg. {cao.registro}</p>}
            </div>
          </div>
          {Array.from({ length: G }, (_, i) => i + 1).flatMap((ger) => {
            const span = 2 ** (G - ger);
            return caminhosDaGeracao(ger).map((c, i) => (
              <div key={c} style={{ gridColumn: ger + 1, gridRow: `${i * span + 1} / span ${span}` }}>
                <Celula no={noDe(c)} rotulo={rotuloCaminho(c)} mostrarRegistro={mostrarRegistro} grande={ger <= 2} />
              </div>
            ));
          })}
        </div>
      </div>

      <p className="mt-6 text-[11px] text-center" style={{ color: "var(--ink-muted)" }}>
        Mapa genealógico gerado em {hoje} a partir dos dados informados pelo criador. Não substitui o pedigree oficial emitido pela entidade de registro.
      </p>
    </main>
  );
}
