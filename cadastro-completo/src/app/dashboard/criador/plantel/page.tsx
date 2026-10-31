import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { agruparDuplicados } from "@/lib/duplicados";
import { JuntarDuplicados } from "@/components/juntar-duplicados";
import { LABEL_PAPEL, LABEL_SEXO, formatarData } from "@/lib/labels";

export default async function PlantelPage() {
  const canil = await getCanilDoCriadorLogado();

  const todos = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id },
        orderBy: { criadoEm: "desc" },
      })
    : [];
  const caes = todos.filter((c) => !c.externo);
  const linhagem = todos.filter((c) => c.externo);
  const duplicados = agruparDuplicados(todos);

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
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/criador/plantel/importar-pedigree"
            className="px-4 py-2 rounded border text-sm"
            style={{ borderColor: "var(--brass)", color: "var(--brass)" }}
          >
            Importar pedigree
          </Link>
          <Link
            href="/dashboard/criador/plantel/novo?origem=externo"
            className="px-4 py-2 rounded border text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            Cão de outro canil
          </Link>
          <Link
            href="/dashboard/criador/plantel/novo"
            className="px-4 py-2 rounded text-white text-sm"
            style={{ background: "var(--pine)" }}
          >
            Cadastrar cão
          </Link>
        </div>
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

      {duplicados.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl" style={{ color: "#a32d2d" }}>
            Possíveis cadastros duplicados ({duplicados.length})
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Estes cães têm o mesmo registro, microchip ou nome. Junte-os para manter a árvore e os dados corretos.
          </p>
          <div className="mt-4 card divide-y" style={{ borderColor: "var(--border-hairline)" }}>
            {duplicados.map((g) => (
              <JuntarDuplicados key={g.cães.map((c) => c.id).join("-")} grupo={g.cães.map((c) => ({ id: c.id, nome: c.nome, registro: c.registro, externo: c.externo }))} />
            ))}
          </div>
        </section>
      )}

      {linhagem.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
            Linhagem: cães de outros canis
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Ancestrais e reprodutores de fora. Aparecem só na árvore genealógica e na escolha de pais; não entram nas contagens, nos alertas nem no marketplace.
          </p>
          <div className="mt-4 card divide-y" style={{ borderColor: "var(--border-hairline)" }}>
            {linhagem.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/criador/plantel/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:opacity-80"
              >
                <span>
                  <span className="font-display" style={{ color: "var(--pine)" }}>{c.nome}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--ink-muted)" }}>
                    {LABEL_SEXO[c.sexo]}{c.corBase ? ` · ${c.corBase}` : c.corPelagem ? ` · ${c.corPelagem}` : ""}
                  </span>
                </span>
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {c.registro ? `${c.registro}` : "sem registro"}{c.canilOrigem ? ` · ${c.canilOrigem}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
