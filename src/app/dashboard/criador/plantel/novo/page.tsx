import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { CadastroCaoArvore } from "@/components/cadastro-cao-arvore";

export default async function NovoCaoPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string }>;
}) {
  const { origem } = await searchParams;
  const deOutroCanil = origem === "externo";
  const canil = await getCanilDoCriadorLogado();

  const caesExistentes = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id },
        select: { id: true, nome: true, sexo: true, externo: true, registro: true },
        orderBy: { nome: "asc" },
      })
    : [];

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        {deOutroCanil ? "Cadastrar cão de outro canil" : "Cadastrar cão"}
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        {canil?.nome}
      </p>

      {!deOutroCanil && (
        <Link
          href="/dashboard/criador/plantel/importar-pedigree"
          className="block mt-6 rounded-lg p-4 text-sm border hover:opacity-90"
          style={{ borderColor: "var(--brass)", background: "#f7ecd9", color: "var(--ink)" }}
        >
          <strong>Tem o pedigree em foto ou PDF?</strong> Importe: a plataforma lê o documento e monta a árvore inteira de uma vez, sem digitar.{" "}
          <span style={{ color: "var(--brass)" }}>Importar pedigree →</span>
        </Link>
      )}

      <div className="card mt-8 p-8">
        <CadastroCaoArvore caesExistentes={caesExistentes} principalExterno={deOutroCanil} />
      </div>
    </main>
  );
}
