import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/labels";

async function carregar(token: string) {
  return prisma.ninhada.findUnique({
    where: { tokenAlbum: token },
    include: { caoMae: { include: { canil: true } }, caoPai: true, fotosAlbum: { orderBy: { criadoEm: "asc" } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const n = await carregar(token);
  if (!n) return {};
  return { title: `Filhotes de ${n.caoMae.canil.nome}`, robots: { index: false }, openGraph: { images: n.fotosAlbum[0] ? [n.fotosAlbum[0].url] : [] } };
}

export default async function AlbumPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const n = await carregar(token);
  if (!n || n.fotosAlbum.length === 0) notFound();
  const canil = n.caoMae.canil;
  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 sm:px-8 py-12">
      <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--brass)" }}>Álbum de filhotes</p>
      <h1 className="font-display text-3xl mt-2" style={{ color: "var(--pine)" }}>{canil.nome}</h1>
      <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
        {n.caoMae.nome}{n.caoPai ? ` × ${n.caoPai.nome}` : n.padreadorExterno ? ` × ${n.padreadorExterno}` : ""}
        {n.dataParto ? ` · nascidos em ${formatarData(n.dataParto)}` : ""}
      </p>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {n.fotosAlbum.map((f) => (
          <a key={f.id} href={f.url} target="_blank" rel="noreferrer" download>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="Filhote" className="w-full aspect-square object-cover rounded" />
          </a>
        ))}
      </div>
      {canil.verificado && (
        <Link href={`/${canil.slug}`} className="inline-block mt-8 px-5 py-2.5 rounded text-white text-sm" style={{ background: "var(--pine)" }}>
          Conhecer o canil e ver filhotes disponíveis
        </Link>
      )}
    </main>
  );
}
