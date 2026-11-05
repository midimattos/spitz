import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cobrancaAtiva, situacaoAssinatura } from "@/lib/assinatura";

async function carregarAviso(): Promise<{ texto: string; alerta: boolean } | null> {
  try {
    if (!cobrancaAtiva()) return null;
    const session = await auth();
    if (session?.user?.role !== "CRIADOR") return null;
    const canil = await prisma.canil.findUnique({ where: { ownerId: session.user.id } });
    if (!canil || canil.assinaturaPro) return null;
    const s = situacaoAssinatura(canil);
    if (s.bloqueado) return { texto: "Seu acesso terminou: você só consulta seus dados. Assine para voltar a editar.", alerta: true };
    if (!s.ativo) return { texto: "Seu acesso venceu. Assine agora para não perder a edição.", alerta: true };
    if (s.diasRestantes <= 7) return { texto: `Seu acesso termina em ${s.diasRestantes} dia${s.diasRestantes === 1 ? "" : "s"}.`, alerta: false };
    return null;
  } catch {
    return null;
  }
}

/** Faixa no topo para o criador: avisa do fim do teste, da tolerância e do acesso vencido. */
export async function AvisoAssinatura() {
  const aviso = await carregarAviso();
  if (!aviso) return null;
  return (
    <div className="text-center text-sm px-4 py-2" style={{ background: aviso.alerta ? "#f6dcdc" : "#f6efe0", color: aviso.alerta ? "#7a1f1f" : "var(--ink)" }}>
      {aviso.texto}{" "}
      <Link href="/dashboard/criador/assinatura" className="underline font-medium">Ver planos</Link>
    </div>
  );
}
