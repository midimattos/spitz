import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { MensagemRespondidaButton } from "@/components/mensagem-respondida-button";

export default async function MensagensPage() {
  const canil = await getCanilDoCriadorLogado();

  const mensagens = canil
    ? await prisma.mensagemContato.findMany({
        where: { anuncio: { canilId: canil.id } },
        include: { anuncio: { include: { cao: true } } },
        orderBy: { criadoEm: "desc" },
      })
    : [];

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Mensagens
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Interesse recebido em todos os seus anúncios.
      </p>

      {mensagens.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>Nenhuma mensagem ainda.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {mensagens.map((m) => (
            <div key={m.id} className="card p-5 text-sm">
              <div className="flex items-center justify-between">
                <p>
                  <strong>{m.nome}</strong> · {m.email}
                  {m.telefone ? ` · ${m.telefone}` : ""}
                </p>
                <span style={{ color: "var(--ink-muted)" }}>{formatarData(m.criadoEm)}</span>
              </div>
              <p className="mt-1" style={{ color: "var(--ink-muted)" }}>
                Sobre:{" "}
                <Link href={`/dashboard/criador/anuncios/${m.anuncio.id}`} className="underline">
                  {m.anuncio.titulo}
                </Link>
              </p>
              <p className="mt-2">{m.mensagem}</p>
              <div className="mt-3">
                <MensagemRespondidaButton mensagemId={m.id} respondida={!!m.respondidaEm} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
