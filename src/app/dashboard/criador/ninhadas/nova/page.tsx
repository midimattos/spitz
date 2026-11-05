import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { NinhadaNascidaForm } from "@/components/ninhada-nascida-form";

export default async function NovaNinhadaNascidaPage() {
  const canil = await getCanilDoCriadorLogado();
  const caes = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id },
        select: { id: true, nome: true, sexo: true, externo: true, vendidoEm: true },
        orderBy: { nome: "asc" },
      })
    : [];
  const femeas = caes.filter((c) => c.sexo === "FEMEA" && !c.externo).map((c) => ({ id: c.id, nome: c.nome }));
  // Só cães do seu canil (os de outros canis que entraram só pela árvore genealógica não aparecem).
  // Pai de fora ou emprestado: use "Cadastrar cão emprestado" no formulário.
  const machos = caes.filter((c) => c.sexo === "MACHO" && !c.externo).map((c) => ({ id: c.id, nome: c.vendidoEm ? `${c.nome} (vendido)` : c.nome }));

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 sm:px-8 py-10">
      <Link href="/dashboard/criador/ninhadas" className="text-sm underline" style={{ color: "var(--brass)" }}>← Ninhadas</Link>
      <h1 className="font-display text-3xl mt-3" style={{ color: "var(--pine)" }}>Cadastrar ninhada que já nasceu</h1>
      <p className="mt-1 text-sm max-w-2xl" style={{ color: "var(--ink-muted)" }}>
        Use para registrar o que já nasceu no seu canil: a mãe, o pai, a data e cada filhote. Eles entram no Plantel, aparecem nos Descendentes dos pais e as vendas vão para o Financeiro.
      </p>
      <div className="mt-8">
        <NinhadaNascidaForm femeas={femeas} machos={machos} />
      </div>
    </main>
  );
}
