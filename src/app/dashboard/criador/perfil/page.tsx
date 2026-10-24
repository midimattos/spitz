import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { PerfilCanilForm } from "@/components/perfil-canil-form";

export default async function PerfilPublicoPage() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) notFound();
  const caes = await prisma.cao.findMany({
    where: { canilId: canil.id, papel: { in: ["MATRIZ", "PADREADOR"] }, dataFalecimento: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, exibirNoCanil: true },
  });
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 sm:px-8 py-12">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Página pública do canil</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Sua vitrine para compartilhar no Instagram e com quem pergunta pelos filhotes.
        {!canil.verificado && " Ela só fica visível ao público depois que o canil for verificado."}
      </p>
      <div className="mt-8">
        <PerfilCanilForm
          canil={{ nome: canil.nome, slug: canil.slug, descricao: canil.descricao, instagram: canil.instagram, fotos: canil.fotos }}
          plantel={caes.map((c) => ({ id: c.id, nome: c.nome, exibir: c.exibirNoCanil }))}
        />
      </div>
    </main>
  );
}
