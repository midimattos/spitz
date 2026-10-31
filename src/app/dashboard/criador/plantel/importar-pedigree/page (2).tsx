import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { ImportarPedigree } from "@/components/importar-pedigree";

export default async function ImportarPedigreePage() {
  const canil = await getCanilDoCriadorLogado();
  const caes = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id },
        select: { id: true, nome: true, sexo: true, externo: true },
        orderBy: { nome: "asc" },
      })
    : [];

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 sm:px-8 py-12">
      <Link href="/dashboard/criador/plantel" className="text-sm underline" style={{ color: "var(--ink-muted)" }}>← Plantel</Link>
      <h1 className="font-display text-3xl mt-3" style={{ color: "var(--pine)" }}>Importar pedigree</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>Monte a árvore genealógica a partir da foto ou do PDF do pedigree.</p>
      <div className="mt-8">
        <ImportarPedigree caes={caes} />
      </div>
    </main>
  );
}
