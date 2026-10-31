import Link from "next/link";
import { LABEL_SEXO } from "@/lib/labels";

type CaoBasico = { id: string; nome: string; sexo: "MACHO" | "FEMEA" } | null;

function Caixa({ cao, papel }: { cao: CaoBasico; papel: string }) {
  if (!cao) {
    return (
      <div
        className="rounded border border-dashed px-4 py-3 text-sm text-center"
        style={{ borderColor: "var(--border-hairline)", color: "var(--ink-muted)" }}
      >
        {papel} não informado(a)
      </div>
    );
  }

  return (
    <Link
      href={`/dashboard/criador/plantel/${cao.id}`}
      className="card block px-4 py-3 text-sm hover:opacity-90"
    >
      <p style={{ color: "var(--pine)" }}>{cao.nome}</p>
      <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
        {papel} · {LABEL_SEXO[cao.sexo]}
      </p>
    </Link>
  );
}

export function ArvoreGenealogica({ pai, mae }: { pai: CaoBasico; mae: CaoBasico }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Caixa cao={pai} papel="Pai" />
      <Caixa cao={mae} papel="Mãe" />
    </div>
  );
}
