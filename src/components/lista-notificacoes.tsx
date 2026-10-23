import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/labels";
import { NotificacoesMarcarLidas } from "@/components/notificacoes-marcar-lidas";

/** Lista de avisos do usuário (usada nos painéis de criador e de comprador). */
export async function ListaNotificacoes({ userId }: { userId: string }) {
  const avisos = await prisma.notificacao.findMany({
    where: { userId },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });
  const naoLidas = avisos.filter((a) => !a.lida).length;

  if (avisos.length === 0) {
    return (
      <div className="card mt-8 p-8 text-center">
        <p style={{ color: "var(--ink-muted)" }}>Nenhum aviso por enquanto.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {naoLidas > 0 && (
        <div className="flex justify-end">
          <NotificacoesMarcarLidas todas />
        </div>
      )}
      <div className="mt-3 space-y-3">
        {avisos.map((a) => (
          <div
            key={a.id}
            className="card p-5 text-sm"
            style={a.lida ? { opacity: 0.65 } : { borderLeft: "3px solid var(--brass)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p>
                  <strong>{a.titulo}</strong>
                </p>
                <p className="mt-1" style={{ color: "var(--ink-muted)" }}>
                  {a.mensagem}
                </p>
                {a.link && (
                  <Link href={a.link} className="inline-block mt-2 underline" style={{ color: "var(--brass)" }}>
                    Abrir
                  </Link>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {formatarData(a.criadoEm)}
                </p>
                {!a.lida && (
                  <div className="mt-1">
                    <NotificacoesMarcarLidas id={a.id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
