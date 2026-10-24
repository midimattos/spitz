import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminCanilToggle } from "@/components/admin-canil-toggle";
import { AdminProToggle } from "@/components/admin-pro-toggle";
import { AdminAvaliacaoToggle } from "@/components/admin-avaliacao-toggle";
import { AdminDesejoValidacao } from "@/components/admin-desejo-validacao";
import { formatarData } from "@/lib/labels";

export default async function AdminPage() {
  const session = await auth();

  const canisBrutos = await prisma.canil.findMany({
    include: { owner: true, _count: { select: { caes: true, anuncios: true } } },
    orderBy: { criadoEm: "desc" },
  });

  // Fila de aprovação: quem solicitou verificação (mais antigo primeiro)
  // aparece antes de quem ainda não pediu nada.
  const canis = [...canisBrutos].sort((a, b) => {
    if (a.solicitacaoVerificacaoEm && b.solicitacaoVerificacaoEm) {
      return a.solicitacaoVerificacaoEm.getTime() - b.solicitacaoVerificacaoEm.getTime();
    }
    if (a.solicitacaoVerificacaoEm) return -1;
    if (b.solicitacaoVerificacaoEm) return 1;
    return 0;
  });

  const denuncias = await prisma.denunciaLead.findMany({
    include: {
      mensagemContato: { include: { anuncio: true } },
      match: { include: { anuncio: true, desejo: { include: { user: true } } } },
    },
    orderBy: { criadoEm: "desc" },
  });

  // Fila de validação de compradores (anti-fraude): pendentes primeiro, mais antigos antes.
  const compradores = await prisma.desejoComprador.findMany({
    include: { user: true },
    orderBy: { criadoEm: "asc" },
  });
  const compradoresOrdenados = [...compradores].sort((a, b) => {
    const peso = (v: string) => (v === "PENDENTE" ? 0 : v === "REJEITADO" ? 2 : 1);
    return peso(a.validacao) - peso(b.validacao);
  });
  const pendentes = compradores.filter((c) => c.validacao === "PENDENTE").length;

  const avaliacoes = await prisma.avaliacao.findMany({
    include: { canil: true },
    orderBy: { criadoEm: "desc" },
    take: 20,
  });

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
            Painel administrativo
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
            Logado como {session?.user?.email}.
          </p>
        </div>
        <Link href="/admin/armazenamento" className="text-sm underline mr-4" style={{ color: "var(--brass)" }}>
          Diagnóstico de fotos
        </Link>
        <Link href="/admin/integridade" className="text-sm underline mr-4" style={{ color: "var(--brass)" }}>
          Integridade dos dados
        </Link>
        <Link href="/admin/analytics" className="text-sm underline" style={{ color: "var(--brass)" }}>
          Ver analytics
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Canis (fila de aprovação)
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          Só canis verificados aparecem no marketplace público e podem
          receber avaliações. Canis com solicitação de verificação
          aparecem primeiro.
        </p>

        <div className="mt-4 space-y-3">
          {canis.map((c) => (
            <div key={c.id} className="card p-5 flex items-center justify-between">
              <div>
                <p className="font-display" style={{ color: "var(--pine)" }}>
                  {c.nome}
                  {c.solicitacaoVerificacaoEm && !c.verificado && (
                    <span className="ml-2 text-xs" style={{ color: "var(--brass)" }}>
                      solicitado em {formatarData(c.solicitacaoVerificacaoEm)}
                    </span>
                  )}
                </p>
                <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                  {c.owner.name} · {c.owner.email} · {c._count.caes} cão(ães) ·{" "}
                  {c._count.anuncios} anúncio(s)
                  {c.cidade ? ` · ${c.cidade}${c.estado ? `/${c.estado}` : ""}` : ""}
                </p>
                {(c.telefoneContato || c.instagram) && (
                  <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                    {c.telefoneContato}
                    {c.telefoneContato && c.instagram ? " · " : ""}
                    {c.instagram}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <AdminCanilToggle canilId={c.id} verificado={c.verificado} />
                <AdminProToggle canilId={c.id} assinaturaPro={c.assinaturaPro} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Compradores (validação anti-fraude){" "}
          {pendentes > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full text-white align-middle" style={{ background: "var(--brass)" }}>
              {pendentes} na fila
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          O contato de um comprador só é liberado ao criador depois de aprovado aqui. Confira nome, WhatsApp e, se
          informado, CPF antes de aprovar.
        </p>
        {compradoresOrdenados.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nenhum comprador cadastrou desejo ainda.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {compradoresOrdenados.map((c) => (
              <div key={c.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="text-sm">
                  <p>
                    <strong>{c.user.name}</strong> · {c.user.email}
                    <span
                      className="ml-2 text-xs"
                      style={{
                        color:
                          c.validacao === "APROVADO"
                            ? "var(--pine)"
                            : c.validacao === "REJEITADO"
                              ? "#a32d2d"
                              : "var(--brass)",
                      }}
                    >
                      {c.validacao === "APROVADO" ? "aprovado" : c.validacao === "REJEITADO" ? "rejeitado" : "pendente"}
                    </span>
                  </p>
                  <p style={{ color: "var(--ink-muted)" }}>
                    WhatsApp {c.telefone}
                    {c.cpf ? ` · CPF informado` : " · sem CPF"}
                    {c.porte ? ` · quer porte ${c.porte}` : ""}
                    {c.corPelagem ? ` · ${c.corPelagem}` : ""}
                    {c.estado ? ` · ${c.estado}` : ""} · desde {formatarData(c.criadoEm)}
                  </p>
                </div>
                <AdminDesejoValidacao desejoId={c.id} validacao={c.validacao} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Avaliações recentes (moderação)
        </h2>
        {avaliacoes.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nenhuma avaliação ainda.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {avaliacoes.map((a) => (
              <div key={a.id} className="card p-4 text-sm flex items-center justify-between">
                <div>
                  <p style={{ opacity: a.oculta ? 0.5 : 1 }}>
                    <span style={{ color: "var(--brass)" }}>{"★".repeat(a.nota)}</span>{" "}
                    <strong>{a.autorNome}</strong> em {a.canil.nome}
                    {a.oculta && " (oculta)"}
                  </p>
                  {a.comentario && (
                    <p style={{ color: "var(--ink-muted)", opacity: a.oculta ? 0.5 : 1 }}>{a.comentario}</p>
                  )}
                </div>
                <AdminAvaliacaoToggle avaliacaoId={a.id} oculta={a.oculta} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Denúncias de leads
        </h2>
        {denuncias.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nenhuma denúncia registrada.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {denuncias.map((d) => (
              <div key={d.id} className="card p-4 text-sm">
                <p style={{ color: "var(--ink-muted)" }}>{formatarData(d.criadoEm)}</p>
                <p className="mt-1">
                  {d.mensagemContato
                    ? `Mensagem em "${d.mensagemContato.anuncio.titulo}"`
                    : d.match
                      ? `Match de ${d.match.desejo.user.name} em "${d.match.anuncio.titulo}"`
                      : "Lead"}
                </p>
                <p className="mt-1">Motivo: {d.motivo}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
