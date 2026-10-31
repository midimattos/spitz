import type { Metadata } from "next";
import { PaginaCanil, carregarCanilPublico } from "@/components/pagina-canil";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const canil = await carregarCanilPublico(slug);
  if (!canil) return {};
  const descricao = canil.descricao?.slice(0, 160) ?? `Canil de Spitz Alemão em ${canil.cidade ?? "todo o Brasil"}.`;
  return { title: `${canil.nome} | Spitz Alemão`, description: descricao, openGraph: { title: canil.nome, description: descricao, images: canil.fotos[0] ? [canil.fotos[0]] : [] } };
}

export default async function CanilPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PaginaCanil slug={slug} />;
}
