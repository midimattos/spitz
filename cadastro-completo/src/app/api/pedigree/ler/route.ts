import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { lerPedigreeComIA } from "@/lib/ia";
import { acharDuplicado } from "@/lib/duplicados";
import { verificarLimite, mensagemLimite } from "@/lib/limite-taxa";
import { achatarArvore, normalizarArvore, sexoDoCaminho } from "@/lib/pedigree-arvore";

const TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const lim = await verificarLimite(`pedigree-ler:${canil.id}`, 20, 24 * 60 * 60);
  if (!lim.ok) return NextResponse.json({ error: mensagemLimite(lim) }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return NextResponse.json({ error: "Selecione o arquivo do pedigree." }, { status: 400 });
  if (!TIPOS.includes(arquivo.type)) return NextResponse.json({ error: "Envie uma foto (JPG, PNG) ou um PDF." }, { status: 400 });
  if (arquivo.size > 4_300_000) return NextResponse.json({ error: "O arquivo passa de 4 MB." }, { status: 400 });

  const leitura = await lerPedigreeComIA(Buffer.from(await arquivo.arrayBuffer()).toString("base64"), arquivo.type);
  if (!leitura.ok) {
    const msg =
      leitura.motivo === "sem-chave"
        ? "A leitura automática ainda não está ativada nesta plataforma. Cadastre os cães manualmente."
        : leitura.motivo === "ilegivel"
          ? "Não consegui ler este documento. Tente uma foto mais nítida, de frente e bem iluminada."
          : "Não foi possível ler o pedigree agora. Tente de novo em instantes.";
    return NextResponse.json({ error: msg }, { status: leitura.motivo === "sem-chave" ? 503 : 422 });
  }

  const arvore = normalizarArvore(leitura.arvore);
  if (!arvore) return NextResponse.json({ error: "Não encontrei um pedigree neste arquivo. Tente uma foto mais nítida." }, { status: 422 });

  const linhas = achatarArvore(arvore);
  const raw = (leitura.arvore ?? {}) as { sexo?: unknown };
  const sexoPrincipal = raw.sexo === "FEMEA" ? "FEMEA" : "MACHO";

  // Quais cães já existem na conta (por registro ou por nome + sexo)?
  const existentes = await prisma.cao.findMany({
    where: { canilId: canil.id },
    select: { id: true, nome: true, sexo: true, registro: true, microchip: true },
  });
  for (const l of linhas) {
    const sexo = sexoDoCaminho(l.caminho) ?? sexoPrincipal;
    const achado = acharDuplicado(existentes, { nome: l.nome, sexo, registro: l.registro, microchip: l.microchip })?.cao ?? null;
    if (achado) {
      l.existenteId = achado.id;
      l.existenteNome = achado.nome;
    }
  }

  return NextResponse.json({ sexoPrincipal, linhas });
}
