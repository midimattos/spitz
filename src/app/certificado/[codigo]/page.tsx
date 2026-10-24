import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { urlBase } from "@/lib/url-base";
import { LABEL_SEXO, formatarData } from "@/lib/labels";
import { ImprimirButton } from "@/components/imprimir-button";

export const metadata = { title: "Certificado digital do filhote" };

export default async function CertificadoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const cert = await prisma.certificado.findUnique({
    where: { codigo: codigo.toUpperCase() },
    include: {
      canil: true,
      cao: {
        include: {
          pai: true,
          mae: true,
          documentos: { select: { tipo: true } },
          laudosGeneticos: { select: { id: true } },
        },
      },
    },
  });
  if (!cert) notFound();

  const base = await urlBase();
  const link = `${base}/certificado/${cert.codigo}`;
  const qr = await QRCode.toString(link, { type: "svg", margin: 1, width: 150, color: { dark: "#1e3a2f", light: "#faf7ef" } });
  const { cao, canil } = cert;
  const temPedigree = cao.documentos.some((d) => d.tipo === "PEDIGREE");
  const temDna = cao.temExameCorDNA || cao.laudosGeneticos.length > 0 || cao.documentos.some((d) => d.tipo === "LAUDO_GENETICO");

  const linhas: [string, string | null | undefined][] = [
    ["Nome", cao.nome],
    ["Sexo", LABEL_SEXO[cao.sexo]],
    ["Nascimento", cao.dataNascimento ? formatarData(cao.dataNascimento) : null],
    ["Cor", [cao.corBase, cao.marcacaoCor].filter(Boolean).join(" · ") || cao.corPelagem],
    ["Porte", cao.porte],
    ["Pai", cao.pai?.nome],
    ["Mãe", cao.mae?.nome],
    ["Microchip", cao.microchip],
  ];

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
      <div className="nao-imprimir flex justify-end mb-4"><ImprimirButton rotulo="Imprimir certificado" /></div>
      <div className="p-2 rounded-lg" style={{ background: "var(--parchment-card)", border: "2px solid var(--brass)" }}>
        <div className="rounded p-8 text-center" style={{ border: "1px solid var(--brass)" }}>
          {cert.revogado && <p className="text-sm mb-3" style={{ color: "#a32d2d" }}>CERTIFICADO REVOGADO PELO CANIL</p>}
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--brass)" }}>Certificado digital de procedência</p>
          <h1 className="font-display text-4xl mt-3" style={{ color: "var(--pine)" }}>{cao.nome}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>Spitz Alemão · criado por <strong>{canil.nome}</strong></p>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-left mt-8 text-sm">
            {linhas.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <ul className="flex flex-wrap justify-center gap-2 mt-6 text-xs">
            {[canil.verificado ? "Canil verificado" : null, temPedigree ? "Pedigree anexado" : null, temDna ? "Exame de DNA" : null, cao.paiId && cao.maeId ? "Linhagem registrada" : null]
              .filter(Boolean)
              .map((s) => (
                <li key={s} className="rounded-full border px-3 py-1" style={{ borderColor: "var(--brass)", color: "var(--pine)" }}>{s}</li>
              ))}
          </ul>

          <div className="mt-8 flex flex-col items-center gap-2">
            <div dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code do certificado" />
            <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Código <strong>{cert.codigo}</strong> · emitido em {formatarData(cert.emitidoEm)}</p>
            {cert.compradorNome && <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Novo tutor: {cert.compradorNome}</p>}
          </div>

          <p className="text-xs mt-6" style={{ color: "var(--ink-muted)" }}>
            Emitido e assinado digitalmente por {canil.nome}{canil.cidade ? `, ${canil.cidade}${canil.estado ? `/${canil.estado}` : ""}` : ""}. A autenticidade pode ser conferida a qualquer momento lendo o QR code, que abre este registro na plataforma.
          </p>
        </div>
      </div>
      <p className="nao-imprimir text-center text-sm mt-6">
        <Link href={`/${canil.slug}`} className="underline" style={{ color: "var(--brass)" }}>Conhecer o canil {canil.nome}</Link>
      </p>
    </main>
  );
}
