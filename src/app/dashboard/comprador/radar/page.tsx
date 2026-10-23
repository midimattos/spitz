import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatarMoeda } from "@/lib/financeiro";
import { LABEL_SEXO } from "@/lib/labels";
import { DesejoForm } from "@/components/desejo-form";
import { MatchInteresseButton } from "@/components/match-interesse-button";
import type { Prisma } from "@prisma/client";

export default async function RadarDemandaPage() {
  const session = await auth();
  if (!session?.user) return null;

  const desejo = await prisma.desejoComprador.findUnique({
    where: { userId: session.user.id },
  });

  const where: Prisma.AnuncioWhereInput = {
    status: "PUBLICADO",
    canil: { verificado: true },
    cao: {
      ...(desejo?.porte ? { porte: desejo.porte } : {}),
      ...(desejo?.sexo ? { sexo: desejo.sexo } : {}),
    },
    ...(desejo?.precoMax ? { preco: { lte: desejo.precoMax } } : {}),
  };

  const anunciosCompativeis = desejo
    ? await prisma.anuncio.findMany({
        where,
        include: { cao: true, canil: true },
        orderBy: { criadoEm: "desc" },
      })
    : [];

  const matchesExistentes = desejo
    ? await prisma.match.findMany({
        where: { desejoId: desejo.id },
        include: { anuncio: { include: { canil: { include: { owner: true } } } } },
      })
    : [];

  const statusPorAnuncio = new Map<string, (typeof matchesExistentes)[number]>(
    matchesExistentes.map((m) => [m.anuncioId, m])
  );

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Radar de demanda
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Diga o que você procura e veja anúncios compatíveis assim que
        forem publicados.
      </p>

      {desejo?.validacao === "PENDENTE" && (
        <p className="mt-4 text-sm card p-4" style={{ color: "var(--brass)" }}>
          Cadastro em validação pela equipe. Você já pode registrar interesse; o criador só vê o seu contato depois
          da aprovação.
        </p>
      )}
      {desejo?.validacao === "REJEITADO" && (
        <p className="mt-4 text-sm card p-4" style={{ color: "#a32d2d" }}>
          Seu cadastro não foi aprovado{desejo.validacaoNota ? `: ${desejo.validacaoNota}` : "."}
        </p>
      )}

      <div className="card mt-6 p-6">
        <DesejoForm
          desejoInicial={
            desejo
              ? { ...desejo, precoMax: desejo.precoMax ? Number(desejo.precoMax) : null }
              : null
          }
        />
      </div>

      {desejo && (
        <section className="mt-10">
          <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
            Anúncios compatíveis
          </h2>

          {anunciosCompativeis.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
              Nenhum anúncio compatível com seu desejo no momento.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {anunciosCompativeis.map((a) => {
                const match = statusPorAnuncio.get(a.id);
                const contatoRevelado =
                  match?.statusComprador === "ACEITO" &&
                  match.statusCriador === "ACEITO" &&
                  desejo?.validacao === "APROVADO";

                return (
                  <div key={a.id} className="card p-5 flex items-center justify-between">
                    <div>
                      <Link href={`/marketplace/${a.id}`} className="font-display hover:underline" style={{ color: "var(--pine)" }}>
                        {a.titulo}
                      </Link>
                      <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
                        {a.canil.nome} · {LABEL_SEXO[a.cao.sexo]}
                        {a.cao.porte ? ` · ${a.cao.porte}` : ""} · {formatarMoeda(Number(a.preco))}
                      </p>
                      {contatoRevelado && match && (
                        <p className="text-sm mt-1" style={{ color: "var(--pine)" }}>
                          Contato liberado: {match.anuncio.canil.owner.email}
                        </p>
                      )}
                    </div>
                    <MatchInteresseButton anuncioId={a.id} statusAtual={match?.statusComprador ?? null} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
