import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { urlBaseDaRequisicao } from "@/lib/url-base";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const n = await prisma.ninhada.findFirst({
    where: { id, caoMae: { canilId: canil.id } },
    include: { caoMae: true, caoPai: true, fotosAlbum: { orderBy: { criadoEm: "asc" }, take: 1 } },
  });
  if (!n) return new Response("Ninhada não encontrada", { status: 404 });

  const candidatas = [n.fotosAlbum[0]?.url, n.caoMae.fotoUrl, canil.fotos[0]].filter((u): u is string => !!u && /^https?:\/\//.test(u));
  const foto = candidatas[0];
  const base = urlBaseDaRequisicao(request).replace(/^https?:\/\//, "");
  const pai = n.caoPai?.nome ?? n.padreadorExterno ?? null;
  const quando = n.dataParto
    ? `Nascidos em ${n.dataParto.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
    : `Previsão de nascimento: ${n.dataPrevistaParto.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#12241d", color: "#f6efe0", fontFamily: "serif" }}>
        <div style={{ display: "flex", flex: 1, background: "#1d3a2e", position: "relative" }}>
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="" width={1080} height={1100} style={{ width: 1080, height: 1100, objectFit: "cover" }} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "64px 72px", height: 820 }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: "#e3c999", textTransform: "uppercase" }}>
            {n.dataParto ? "Ninhada disponível" : "Ninhada a caminho"}
          </div>
          <div style={{ display: "flex", fontSize: 84, marginTop: 20, lineHeight: 1.05 }}>{canil.nome}</div>
          <div style={{ display: "flex", fontSize: 44, marginTop: 28, color: "#e3c999" }}>
            {n.caoMae.nome}{pai ? ` × ${pai}` : ""}
          </div>
          <div style={{ display: "flex", fontSize: 38, marginTop: 14, opacity: 0.9 }}>{quando}</div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", fontSize: 40, borderTop: "2px solid #e3c999", paddingTop: 28 }}>
            {base}/{canil.slug}
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
