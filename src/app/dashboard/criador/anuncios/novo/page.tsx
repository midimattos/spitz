import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { calcularCOI } from "@/lib/pedigree";
import { consolidarStatusGenetico } from "@/lib/genetica";
import {
  calcularIndiceQualidade,
  sugerirFaixaPreco,
  FAIXA_PADRAO_POR_PORTE,
  type FaixaPreco,
} from "@/lib/precificacao";
import { AnuncioForm } from "@/components/anuncio-form";

export default async function NovoAnuncioPage() {
  const canil = await getCanilDoCriadorLogado();

  const caes = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id },
        include: { laudosGeneticos: { include: { resultados: true } }, documentos: true, dossieGenetico: true },
        orderBy: { nome: "asc" },
      })
    : [];

  const caesComSugestao = await Promise.all(
    caes.map(async (cao) => {
      const faixaConfigurada = cao.porte
        ? await prisma.faixaPrecoBase.findUnique({
            where: { canilId_porte: { canilId: canil!.id, porte: cao.porte } },
          })
        : null;

      const faixaBase: FaixaPreco | null = faixaConfigurada
        ? {
            min: Number(faixaConfigurada.precoMinimo),
            medio: Number(faixaConfigurada.precoMedio),
            max: Number(faixaConfigurada.precoMaximo),
          }
        : cao.porte && FAIXA_PADRAO_POR_PORTE[cao.porte]
          ? FAIXA_PADRAO_POR_PORTE[cao.porte]
          : null;

      if (!faixaBase) return { id: cao.id, nome: cao.nome, precoSugerido: null };

      const coi = await calcularCOI(cao.id);
      const statusProprio = consolidarStatusGenetico(cao.laudosGeneticos);
      const painelSaude = [...statusProprio].map(([condicao, { status }]) => ({
        condicao,
        status,
        origem: "TESTE_DIRETO" as const,
      }));
      const temPedigree = cao.documentos.some((d) => d.tipo === "PEDIGREE");
      const dossiePublicado = cao.dossieGenetico?.publicado ?? false;

      const indice = calcularIndiceQualidade(painelSaude, coi, temPedigree, dossiePublicado);
      const sugestao = sugerirFaixaPreco(faixaBase, indice.indice);

      return { id: cao.id, nome: cao.nome, precoSugerido: sugestao.ideal };
    })
  );

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Criar anúncio
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        O anúncio é criado como rascunho. Você publica quando quiser, na
        página do anúncio.
      </p>

      <div className="card mt-8 p-8">
        <AnuncioForm caesDisponiveis={caesComSugestao} />
      </div>
    </main>
  );
}
