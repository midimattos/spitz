import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";

export default async function ListaEsperaPage() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) notFound();
  const fila = await prisma.listaEspera.findMany({ where: { canilId: canil.id }, orderBy: { criadoEm: "asc" } });
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 sm:px-8 py-12">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Lista de espera</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Pessoas que pediram para ser avisadas dos seus próximos filhotes. Elas recebem um e-mail automático assim que você publica um anúncio.
        O formulário fica na sua página pública do canil.
      </p>
      {fila.length === 0 ? (
        <div className="card mt-8 p-8 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
          Ninguém na fila ainda. Divulgue o link da sua página pública para começar a juntar interessados.
        </div>
      ) : (
        <div className="card mt-8 divide-y" style={{ borderColor: "var(--border-hairline)" }}>
          <p className="p-4 text-sm" style={{ color: "var(--pine)" }}><strong>{fila.length}</strong> interessado{fila.length > 1 ? "s" : ""}</p>
          {fila.map((p) => (
            <div key={p.id} className="p-4 text-sm">
              <p><strong>{p.nome}</strong> <span style={{ color: "var(--ink-muted)" }}>· {p.email}{p.telefone ? ` · ${p.telefone}` : ""} · desde {formatarData(p.criadoEm)}</span></p>
              {p.preferencia && <p style={{ color: "var(--ink-muted)" }}>Procura: {p.preferencia}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
