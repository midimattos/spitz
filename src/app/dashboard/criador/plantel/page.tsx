import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { LABEL_PAPEL, LABEL_SEXO, formatarData } from "@/lib/labels";

export default async function PlantelPage() {
  const canil = await getCanilDoCriadorLogado();

  const caes = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id },
        orderBy: { criadoEm: "desc" },
      })
    : [];

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
            Plantel
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            {canil?.nome}
          </p>
        </div>
        <Link
          href="/dashboard/criador/plantel/novo"
          className="px-4 py-2 rounded text-white text-sm"
          style={{ background: "var(--pine)" }}
        >
          Cadastrar cão
        </Link>
      </div>

      {caes.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>
            Nenhum cão cadastrado ainda. Comece pelas matrizes e padreadores
            do seu canil.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {caes.map((cao) => (
            <Link
              key={cao.id}
              href={`/dashboard/criador/plantel/${cao.id}`}
              className="card overflow-hidden block hover:opacity-90"
            >
              <div
                className="aspect-[4/3] flex items-center justify-center"
                style={{ background: "var(--parchment)" }}
              >
                {cao.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cao.fotoUrl} alt={cao.nome} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Sem foto
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
                    {cao.nome}
                  </h3>
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: "var(--parchment)", color: "var(--brass)" }}
                  >
                    {LABEL_PAPEL[cao.papel]}
                  </span>
                </div>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                  {LABEL_SEXO[cao.sexo]}
                  {cao.corBase ? ` · ${cao.corBase}` : cao.corPelagem ? ` · ${cao.corPelagem}` : ""}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                  Nascimento: {formatarData(cao.dataNascimento)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
