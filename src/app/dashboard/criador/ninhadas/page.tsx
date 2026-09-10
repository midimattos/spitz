import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { RegistrarPartoForm } from "@/components/registrar-parto-form";

export default async function NinhadasPage() {
  const canil = await getCanilDoCriadorLogado();

  const ninhadas = canil
    ? await prisma.ninhada.findMany({
        where: { caoMae: { canilId: canil.id } },
        include: { caoMae: true, caoPai: true },
        orderBy: { dataCobertura: "desc" },
      })
    : [];

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Ninhadas
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Para registrar uma nova cobertura, acesse a ficha da matriz no
        Plantel — a previsão de parto é calculada automaticamente.
      </p>

      {ninhadas.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>Nenhuma ninhada registrada ainda.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {ninhadas.map((n) => (
            <div key={n.id} className="card p-5">
              <div className="flex items-center justify-between">
                <Link
                  href={`/dashboard/criador/plantel/${n.caoMae.id}`}
                  className="font-display text-lg hover:underline"
                  style={{ color: "var(--pine)" }}
                >
                  {n.caoMae.nome}
                </Link>
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {n.dataParto ? "Nascida" : "Prevista"}
                </span>
              </div>
              <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
                Cobertura: {formatarData(n.dataCobertura)} ·{" "}
                {n.caoPai?.nome ?? n.padreadorExterno ?? "padreador não informado"}
              </p>
              <p className="text-sm mt-1">
                {n.dataParto ? (
                  <>Parto: {formatarData(n.dataParto)} · {n.quantidadeFilhotes} filhote(s)</>
                ) : (
                  <>Parto previsto: {formatarData(n.dataPrevistaParto)}</>
                )}
              </p>
              {!n.dataParto && <RegistrarPartoForm ninhadaId={n.id} />}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
