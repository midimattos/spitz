import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { GerarConviteButton } from "@/components/gerar-convite-button";
import { CopiarLinkConvite } from "@/components/copiar-link-convite";

export default async function ConvitesPage() {
  const canil = await getCanilDoCriadorLogado();

  const convites = canil
    ? await prisma.convite.findMany({
        where: { criadoPorCanilId: canil.id },
        include: { usadoPorCanil: true },
        orderBy: { criadoEm: "desc" },
      })
    : [];

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Convites
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Convide outros canis para a plataforma. Quem se cadastrar com o seu
        código já entra verificado, sem esperar a fila de aprovação. Cada canil que entrar dá 30 dias de PRO grátis para vocês dois.
      </p>

      {!canil?.verificado ? (
        <div className="card mt-8 p-6">
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Só canis verificados podem gerar convites. O seu ainda está na
            fila de aprovação.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <GerarConviteButton />
          </div>

          <div className="mt-6 space-y-3">
            {convites.map((c) => (
              <div key={c.id} className="card p-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-mono">{c.codigo}</p>
                  <p style={{ color: "var(--ink-muted)" }}>
                    Criado em {formatarData(c.criadoEm)}
                    {c.usadoPorCanil && ` · usado por ${c.usadoPorCanil.nome}`}
                  </p>
                </div>
                {!c.usadoPorCanilId && <CopiarLinkConvite codigo={c.codigo} />}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
