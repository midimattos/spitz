import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { CaoForm } from "../_components/cao-form";

export default async function NovoCaoPage() {
  const canil = await getCanilDoCriadorLogado();

  const caesExistentes = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id },
        select: { id: true, nome: true, sexo: true },
        orderBy: { nome: "asc" },
      })
    : [];

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Cadastrar cão
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        {canil?.nome}
      </p>

      <div className="card mt-8 p-8">
        <CaoForm caesExistentes={caesExistentes} />
      </div>
    </main>
  );
}
