import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { formatarMoeda } from "@/lib/financeiro";
import { AnuncioStatusForm } from "@/components/anuncio-status-form";
import { AnuncioFotosForm } from "@/components/anuncio-fotos-form";
import { CopiarTextoButton } from "@/components/copiar-texto-button";
import { ReservaPainel } from "@/components/reserva-painel";
import { PedigreeUpload } from "@/components/pedigree-upload";
import { DenunciarLeadButton } from "@/components/denunciar-lead-button";
import { MatchResponderForm } from "@/components/match-responder-form";
import { PagamentoButton } from "@/components/pagamento-button";
import { MensagemRespondidaButton } from "@/components/mensagem-respondida-button";
import { PainelPreco } from "@/components/painel-preco";
import { carregarContextoMercado, carregarFaixasDoCanil, sugerirPreco, diagnosticarAnunciosAtivos } from "@/lib/mercado";

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
      reservas: { where: { ativa: true }, orderBy: { criadoEm: "desc" } },
      historicoPrecos: { orderBy: { criadoEm: "desc" } },
    },
  });
  if (!anuncio) notFound();
  const pedigreeDoCao = await prisma.documento.findFirst({
    where: { caoId: anuncio.caoId, tipo: "PEDIGREE" },
    orderBy: { criadoEm: "desc" },
  });

  const vendaRegistrada = anuncio.status === "VENDIDO"
    ? await prisma.vendaRegistro.findUnique({ where: { anuncioId: anuncio.id }, include: { avaliacao: true, certificados: true, contrato: true } })
    : null;

  // ---- desempenho e leitura do mercado para este anúncio ----
  const [totais, ctx, faixas] = await Promise.all([
    prisma.eventoMercado.groupBy({
      by: ["tipo"],
      where: { anuncioId: anuncio.id },
      _count: { _all: true },
    }),
    carregarContextoMercado(),
    carregarFaixasDoCanil(canil.id),
  ]);
  const contar = (tipo: string) => totais.find((t) => t.tipo === tipo)?._count._all ?? 0;
  const visualizacoes = contar("VISUALIZACAO_ANUNCIO");
  const favoritos = contar("FAVORITO");
  const contatos = contar("CONTATO") + contar("MATCH_INTERESSE");

  const ctxSemEle = { ...ctx, ativos: ctx.ativos.filter((a) => a.id !== anuncio.id) };
  const sugestao = sugerirPreco(anuncio.cao, canil.estado, ctxSemEle, faixas);
  const diagnostico =
    anuncio.status === "PUBLICADO"
      ? diagnosticarAnunciosAtivos(ctx, [{ id: anuncio.id, cao: anuncio.cao }], canil.estado, faixas).get(anuncio.id)
      : undefined;

  // Compradores do radar só aparecem com contato quando já foram validados pela equipe.
  const matchesValidados = anuncio.matches.filter((m) => m.desejo.validacao === "APROVADO");
  const matchesEmValidacao = anuncio.matches.length - matchesValidados.length;

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
          Desempenho e mercado
        </h2>
        <div className="card mt-3 p-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-2xl" style={{ color: "var(--pine)" }}>{visualizacoes}</p>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>visualizações</p>
            </div>
            <div>
              <p className="font-display text-2xl" style={{ color: "var(--pine)" }}>{favoritos}</p>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>favoritos</p>
            </div>
            <div>
              <p className="font-display text-2xl" style={{ color: "var(--pine)" }}>{contatos}</p>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>contatos</p>
            </div>
          </div>

          {diagnostico && (
            <div className="mt-5 p-4 rounded" style={{ background: "var(--parchment)" }}>
              <p className="text-sm" style={{ color: "var(--pine)" }}>
                <strong>{diagnostico.titulo}</strong>
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>{diagnostico.detalhe}</p>
              {diagnostico.precoSugerido && (
                <p className="text-sm mt-1">
                  Preço sugerido pelo mercado: <strong>{formatarMoeda(diagnostico.precoSugerido)}</strong>
                </p>
              )}
            </div>
          )}

          {sugestao && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--border-hairline)" }}>
              <p className="text-xs mb-3" style={{ color: "var(--ink-muted)" }}>
                Preço de referência para cães como este (preço atual: {formatarMoeda(Number(anuncio.preco))})
              </p>
              <PainelPreco resultado={sugestao} />
            </div>
          )}

          {anuncio.historicoPrecos.length > 1 && (
            <div className="mt-5 pt-5 border-t text-xs" style={{ borderColor: "var(--border-hairline)", color: "var(--ink-muted)" }}>
              <p className="mb-1">Histórico de preço</p>
              {anuncio.historicoPrecos.map((h) => (
                <p key={h.id}>
                  {formatarData(h.criadoEm)} · {formatarMoeda(Number(h.preco))}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
          Pagamentos
        </h2>
        <div className="card mt-3 p-6 space-y-4">
          <div>
            <p className="text-sm">
              {canil.assinaturaPro || canil.verificado ? (
                <>Seu anúncio exibe o selo <strong>Canil verificado pela plataforma</strong>, sem custo extra.</>
              ) : (
                <>Anúncio gratuito.</>
              )}
            </p>
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

      {vendaRegistrada && (
        <section className="mt-8">
          <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Pós-venda</h2>
          <div className="card mt-3 p-6 text-sm space-y-2">
            {vendaRegistrada.certificados[0] && (
              <p>Certificado do filhote: <a href={`/certificado/${vendaRegistrada.certificados[0].codigo}`} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--brass)" }}>{vendaRegistrada.certificados[0].codigo}</a></p>
            )}
            {vendaRegistrada.contrato && (
              <p>
                Contrato de venda:{" "}
                {vendaRegistrada.contrato.aceitoEm ? (
                  <span style={{ color: "var(--pine)" }}>aceito pelo comprador em {formatarData(vendaRegistrada.contrato.aceitoEm)}</span>
                ) : (
                  <span>aguardando aceite do comprador — </span>
                )}
                {!vendaRegistrada.contrato.aceitoEm && (
                  <CopiarTextoButton texto={`/contrato/${vendaRegistrada.contrato.token}`} rotulo="Copiar link do contrato" className="underline" style={{ color: "var(--brass)" }} />
                )}
              </p>
            )}
            {vendaRegistrada.avaliacao ? (
              <p>Avaliação recebida: <span style={{ color: "var(--brass)" }}>{"★".repeat(vendaRegistrada.avaliacao.nota)}</span></p>
            ) : vendaRegistrada.tokenAvaliacao ? (
              <p>Link para o comprador avaliar: <CopiarTextoButton texto={`/avaliar/${vendaRegistrada.tokenAvaliacao}`} rotulo="Copiar link de avaliação" className="underline" style={{ color: "var(--brass)" }} />
                {vendaRegistrada.compradorEmail ? <span style={{ color: "var(--ink-muted)" }}> (já enviado para {vendaRegistrada.compradorEmail})</span> : null}</p>
            ) : (
              <p style={{ color: "var(--ink-muted)" }}>Sem link de avaliação para esta venda.</p>
            )}
          </div>
        </section>
      )}

      {(anuncio.status === "PUBLICADO" || anuncio.reservas.length > 0) && (
        <section className="mt-8">
          <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Reserva</h2>
          <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
            O sinal é combinado e pago direto a você. Registrar a reserva mostra o selo &quot;Reservado&quot; no anúncio.
          </p>
          <div className="card mt-3 p-6">
            <ReservaPainel
              anuncioId={anuncio.id}
              reservas={anuncio.reservas.map((r) => ({ id: r.id, compradorNome: r.compradorNome, compradorEmail: r.compradorEmail, valorSinal: r.valorSinal ? Number(r.valorSinal) : null, criadoEm: r.criadoEm.toISOString() }))}
            />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
          Pedigree
        </h2>
        <div className="mt-3">
          <PedigreeUpload
            caoId={anuncio.caoId}
            atual={(() => {
              const d = pedigreeDoCao;
              return d ? { nome: d.nome, url: d.url } : null;
            })()}
          />
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
                  <div className="mt-2">
                    <MensagemRespondidaButton mensagemId={m.id} respondida={!!m.respondidaEm} />
                  </div>
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
          {matchesEmValidacao > 0 && (
            <p className="text-sm mb-3" style={{ color: "var(--brass)" }}>
              {matchesEmValidacao} interessado{matchesEmValidacao > 1 ? "s" : ""} aguardando validação da
              equipe da plataforma (proteção contra golpes) — eles aparecem aqui assim que forem aprovados.
            </p>
          )}
          {matchesValidados.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Nenhum comprador validado do radar demonstrou interesse ainda.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border-hairline)" }}>
              {matchesValidados.map((m) => (
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
