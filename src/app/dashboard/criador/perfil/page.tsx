import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { PerfilCanilForm } from "@/components/perfil-canil-form";

export default async function PerfilPublicoPage() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) notFound();
  const caes = await prisma.cao.findMany({
    where: { canilId: canil.id, externo: false, papel: { in: ["MATRIZ", "PADREADOR"] }, dataFalecimento: null, vendidoEm: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, exibirNoCanil: true },
  });
  const filhotes = await prisma.cao.findMany({
    where: { canilId: canil.id, externo: false, papel: "FILHOTE", ninhadaId: { not: null }, dataFalecimento: null, vendidoEm: null },
    orderBy: [{ dataNascimento: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true, exibirNoCanil: true },
  });
  const ninhadasBrutas = await prisma.ninhada.findMany({
    where: { caoMae: { canilId: canil.id, externo: false } },
    orderBy: { dataCobertura: "desc" },
    select: { id: true, dataParto: true, dataPrevistaParto: true, exibirNoCanil: true, padreadorExterno: true, caoMae: { select: { nome: true } }, caoPai: { select: { nome: true } } },
  });
  const ninhadas = ninhadasBrutas.map((n) => ({
    id: n.id,
    nome: `${n.caoPai?.nome ?? n.padreadorExterno ?? "Padreador externo"} × ${n.caoMae.nome} — ${
      n.dataParto ? `nasceu em ${n.dataParto.toLocaleDateString("pt-BR")}` : `previsão ${n.dataPrevistaParto.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}`
    }`,
    exibir: n.exibirNoCanil,
  }));
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
          filhotes={filhotes.map((c) => ({ id: c.id, nome: c.nome, exibir: c.exibirNoCanil }))}
          ninhadas={ninhadas}
          temTelefone={!!canil.telefoneContato}
        />
      </div>
    </main>
  );
}
