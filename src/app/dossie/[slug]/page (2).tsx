import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { textoJuridicoDossie } from "@/lib/dossie";
import { LABEL_PAPEL, LABEL_SEXO, formatarData } from "@/lib/labels";

export default async function DossiePublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const dossie = await prisma.dossieGenetico.findFirst({
    where: { slugPublico: slug, publicado: true },
    include: {
      cao: {
        include: {
          canil: true,
          pai: { include: { pai: true, mae: true } },
          mae: { include: { pai: true, mae: true } },
          ninhadasComoMae: true,
          ninhadasComoPai: true,
        },
      },
    },
  });

  if (!dossie) notFound();

  const { cao } = dossie;
  const totalNinhadas = cao.ninhadasComoMae.length + cao.ninhadasComoPai.length;

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <div className="flex items-center gap-3">
        <div className="seal w-16 h-16 flex items-center justify-center shrink-0">
          <span className="text-[10px] text-center leading-tight" style={{ color: "var(--pine)" }}>
            Dossiê
            <br />
            verificado
          </span>
        </div>
        <div>
          <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
            {cao.nome}
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {cao.canil.nome}
            {cao.canil.verificado ? " · Canil verificado" : ""}
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm" style={{ color: "var(--ink-muted)" }}>
        {LABEL_PAPEL[cao.papel]} · {LABEL_SEXO[cao.sexo]}
        {cao.corPelagem ? ` · ${cao.corPelagem}` : ""}
        {cao.porte ? ` · Porte ${cao.porte}` : ""}
        {" · "}Nascimento: {formatarData(cao.dataNascimento)}
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Genealogia
        </h2>
        <div className="card mt-3 p-6 text-sm space-y-2">
          <p>
            <span style={{ color: "var(--ink-muted)" }}>Pai: </span>
            {cao.pai?.nome ?? "não informado"}
            {cao.pai && (cao.pai.pai || cao.pai.mae) && (
              <span style={{ color: "var(--ink-muted)" }}>
                {" "}
                (avós: {cao.pai.pai?.nome ?? "—"} × {cao.pai.mae?.nome ?? "—"})
              </span>
            )}
          </p>
          <p>
            <span style={{ color: "var(--ink-muted)" }}>Mãe: </span>
            {cao.mae?.nome ?? "não informada"}
            {cao.mae && (cao.mae.pai || cao.mae.mae) && (
              <span style={{ color: "var(--ink-muted)" }}>
                {" "}
                (avós: {cao.mae.pai?.nome ?? "—"} × {cao.mae.mae?.nome ?? "—"})
              </span>
            )}
          </p>
          <p className="pt-2">
            <span style={{ color: "var(--ink-muted)" }}>Coeficiente de endogamia (COI): </span>
            <strong style={{ color: "var(--pine)" }}>
              {dossie.coi !== null ? `${(dossie.coi * 100).toFixed(2)}%` : "não calculável"}
            </strong>
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Histórico na plataforma
        </h2>
        <div className="card mt-3 p-6 text-sm space-y-2">
          <p>
            <span style={{ color: "var(--ink-muted)" }}>Cadastrado na plataforma em: </span>
            {formatarData(cao.criadoEm)}
          </p>
          <p>
            <span style={{ color: "var(--ink-muted)" }}>Ninhadas registradas: </span>
            {totalNinhadas}
          </p>
          <p>
            <span style={{ color: "var(--ink-muted)" }}>Criador: </span>
            {cao.canil.nome}
            {cao.canil.verificado ? " — selo de criador verificado" : " — verificação pendente"}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
          {textoJuridicoDossie(cao.nome, cao.canil.nome)}
        </p>
      </section>
    </main>
  );
}
