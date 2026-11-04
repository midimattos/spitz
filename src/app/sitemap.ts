import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { urlBase } from "@/lib/url-base";
import { MARKETPLACE_ATIVO } from "@/lib/marketplace-config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await urlBase();
  const fixas: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    ...(MARKETPLACE_ATIVO ? [{ url: `${base}/marketplace`, changeFrequency: "daily" as const, priority: 0.9 }] : []),
    { url: `${base}/termos`, priority: 0.2 },
    { url: `${base}/privacidade`, priority: 0.2 },
  ];
  try {
    const [anuncios, canis] = await Promise.all([
      !MARKETPLACE_ATIVO ? Promise.resolve([]) : prisma.anuncio.findMany({
        where: { status: "PUBLICADO", canil: { verificado: true } },
        select: { id: true, atualizadoEm: true },
        take: 2000,
      }),
      prisma.canil.findMany({ where: { verificado: true }, select: { slug: true }, take: 1000 }),
    ]);
    return [
      ...fixas,
      ...anuncios.map((a) => ({ url: `${base}/marketplace/${a.id}`, lastModified: a.atualizadoEm, priority: 0.7 })),
      ...canis.map((c) => ({ url: `${base}/canil/${c.slug}`, priority: 0.6 })),
    ];
  } catch {
    return fixas;
  }
}
