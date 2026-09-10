import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { formatarMoeda } from "@/lib/financeiro";
import { LABEL_TIPO_ANUNCIO } from "@/lib/marketplace";
import { PRECO_ANUNCIO_PREMIUM } from "@/lib/precos-plataforma";
import { AnuncioStatusForm } from "@/components/anuncio-status-form";
import { AnuncioFotosForm } from "@/components/anuncio-fotos-form";
import { DenunciarLeadButton } from "@/components/denunciar-lead-button";
import { MatchResponderForm } from "@/components/match-responder-form";
import { PagamentoButton } from "@/components/pagamento-button";

export default async function AnuncioDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagamento?: string }>;
}) {
  const { id } = await params;
  const { pagamento } = await searchParams;
  const canil = await getCanilDoCriadorLogado();
  if (!canil) notFound();

  const anuncio = await prisma.anuncio.findFirst({
    where: { id, canilId: canil.id },
    include: {
      cao: true,
      mensagens: { orderBy: { criadoEm: "desc" }, include: { denuncia: true } },
      matches: {
        where: { statusComprador: "ACEITO" },
        include: { desejo: { include: { user: true } }, denuncia: true },
        orderBy: { criadoEm: "desc" },
      },
      pagamentos: { orderBy: { criadoEm: "desc" } },
    },
  });
  if (!anuncio) notFound();

  const comissaoPendente = anuncio.pagamentos.find(
    (p) => p.tipo === "COMISSAO_VENDA" && p.status === "PENDENTE"
  );

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
            {anuncio.titulo}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
            <Link href={`/dashboard/criador/plantel/${anuncio.cao.id}`} className="underline">
              {anuncio.cao.nome}
            </Link>
          </p>
        </div>
        {anuncio.status === "PUBLICADO" && canil.verificado && (
          <Link
            href={`/marketplace/${anuncio.id}`}
            target="_blank"
            className="text-sm underline"
            style={{ color: "var(--brass)" }}
          >
            Ver no marketplace
          </Link>
        )}
      </div>

      {pagamento === "processando" && (
        <p className="mt-4 text-sm card p-4" style={{ color: "var(--brass)" }}>
          Pagamento em processamento — a confirmação chega em alguns
          segundos via webhook. Atualize a página daqui a pouco.
        </p>
      )}
      {pagamento === "falhou" && (
        <p className="mt-4 text-sm card p-4" style={{ color: "#a32d2d" }}>
          O pagamento não foi concluído. Tente novamente quando quiser.
        </p>
      )}

      <div className="card mt-6 p-6">
        <AnuncioStatusForm
          anuncio={{
            id: anuncio.id,
            preco: Number(anuncio.preco),
            tipo: anuncio.tipo,
            status: anuncio.status,
          }}
        />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
          Pagamentos
        </h2>
        <div className="card mt-3 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                Tipo do anúncio: <strong>{LABEL_TIPO_ANUNCIO[anuncio.tipo]}</strong>
              </p>
              {anuncio.tipo === "GRATUITO" && (
                <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                  Destaque Premium: {formatarMoeda(PRECO_ANUNCIO_PREMIUM)} (pagamento único)
                </p>
              )}
            </div>
            {anuncio.tipo === "GRATUITO" && (
              <PagamentoButton
                endpoint="/api/pagamentos/anuncio-premium"
                body={{ anuncioId: anuncio.id }}
                label="Destacar como Premium"
                className="px-4 py-2 rounded text-white text-sm"
                style={{ background: "var(--brass)" }}
              />
            )}
          </div>

          {comissaoPendente && (
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border-hairline)" }}>
              <p className="text-sm">
                Comissão de venda pendente: <strong>{formatarMoeda(Number(comissaoPendente.valor))}</strong>
              </p>
              <PagamentoButton
                endpoint={`/api/pagamentos/comissao/${comissaoPendente.id}`}
                label="Pagar comissão"
                className="px-4 py-2 rounded text-white text-sm"
                style={{ background: "var(--pine)" }}
              />
            </div>
          )}

          {anuncio.pagamentos.length > 0 && (
            <div className="pt-4 border-t text-xs" style={{ borderColor: "var(--border-hairline)" }}>
              {anuncio.pagamentos.map((p) => (
                <p key={p.id} style={{ color: "var(--ink-muted)" }}>
                  {formatarData(p.criadoEm)} · {p.tipo} · {formatarMoeda(Number(p.valor))} · {p.status}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
          Fotos
        </h2>
        <div className="card mt-3 p-6">
          {anuncio.fotos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
              {anuncio.fotos.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt={anuncio.titulo} className="rounded aspect-square object-cover" />
              ))}
            </div>
          )}
          <AnuncioFotosForm anuncioId={anuncio.id} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
          Mensagens de interesse
        </h2>
        <div className="card mt-3 p-6">
          {anuncio.mensagens.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Nenhuma mensagem recebida ainda.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border-hairline)" }}>
              {anuncio.mensagens.map((m) => (
                <li key={m.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p>
                      <strong>{m.nome}</strong> · {m.email}
                      {m.telefone ? ` · ${m.telefone}` : ""}
                    </p>
                    <DenunciarLeadButton
                      endpoint={`/api/mensagens/${m.id}/denunciar`}
                      jaDenunciado={!!m.denuncia}
                    />
                  </div>
                  <p style={{ color: "var(--ink-muted)" }}>{formatarData(m.criadoEm)}</p>
                  <p className="mt-1">{m.mensagem}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
          Radar de demanda — interessados
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
          Compradores cujo desejo cadastrado combina com este anúncio. O
          contato só é liberado quando você aceita também (double opt-in).
        </p>
        <div className="card mt-3 p-6">
          {anuncio.matches.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Nenhum comprador do radar demonstrou interesse ainda.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border-hairline)" }}>
              {anuncio.matches.map((m) => (
                <li key={m.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p>{m.desejo.user.name}</p>
                    <DenunciarLeadButton
                      endpoint={`/api/matches/${m.id}/denunciar`}
                      jaDenunciado={!!m.denuncia}
                    />
                  </div>
                  <div className="mt-2">
                    <MatchResponderForm
                      matchId={m.id}
                      statusCriador={m.statusCriador}
                      contatoRevelado={
                        m.statusCriador === "ACEITO"
                          ? { telefone: m.desejo.telefone, email: m.desejo.user.email }
                          : null
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
