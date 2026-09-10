import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { CaoForm } from "../../_components/cao-form";

export default async function EditarCaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canil = await getCanilDoCriadorLogado();
  if (!canil) notFound();

  const cao = await prisma.cao.findFirst({ where: { id, canilId: canil.id } });
  if (!cao) notFound();

  const caesExistentes = await prisma.cao.findMany({
    where: { canilId: canil.id },
    select: { id: true, nome: true, sexo: true },
    orderBy: { nome: "asc" },
  });

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Editar {cao.nome}
      </h1>

      <div className="card mt-8 p-8">
        <CaoForm
          caesExistentes={caesExistentes}
          valoresIniciais={{
            id: cao.id,
            nome: cao.nome,
            sexo: cao.sexo,
            papel: cao.papel,
            corPelagem: cao.corPelagem,
            porte: cao.porte,
            microchip: cao.microchip,
            dataNascimento: cao.dataNascimento?.toISOString() ?? null,
            observacoes: cao.observacoes,
            paiId: cao.paiId,
            maeId: cao.maeId,
            corBase: cao.corBase,
            marcacaoCor: cao.marcacaoCor,
            corTrufa: cao.corTrufa,
            diluicaoCor: cao.diluicaoCor,
            merleCor: cao.merleCor,
            intensidadeCor: cao.intensidadeCor,
            coresJaProduzidas: cao.coresJaProduzidas,
            temExameCorDNA: cao.temExameCorDNA,
            dnaLocusB: cao.dnaLocusB,
            dnaLocusE: cao.dnaLocusE,
            dnaLocusK: cao.dnaLocusK,
            dnaLocusA: cao.dnaLocusA,
            dnaLocusD: cao.dnaLocusD,
            dnaLocusS: cao.dnaLocusS,
            dnaLocusM: cao.dnaLocusM,
            dnaLocusI: cao.dnaLocusI,
          }}
        />
      </div>
    </main>
  );
}
