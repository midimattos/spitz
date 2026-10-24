import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Storage de arquivos (fotos, documentos, laudos).
 *
 * Em produção, usa Cloudflare R2 (compatível com a API do S3) — configurado
 * via as variáveis de ambiente R2_*. Isso é necessário porque ambientes
 * serverless como a Vercel têm disco somente leitura fora de /tmp e não
 * persistem arquivos entre deploys/instâncias.
 *
 * Em desenvolvimento local, se as variáveis R2_* não estiverem configuradas,
 * cai automaticamente para salvar em `public/uploads` — assim você continua
 * conseguindo rodar o projeto localmente sem precisar criar uma conta R2 só
 * pra testar. A assinatura da função não muda pros callers.
 */

const r2Configurado =
  !!process.env.R2_ACCOUNT_ID &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET_NAME;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

async function salvarNoR2(
  bytes: Buffer,
  chave: string,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: chave,
        Body: bytes,
        ContentType: contentType,
      })
    );
  } catch (e) {
    // Aparece nos logs da Vercel (Logs > filtrar por Error) para facilitar o diagnóstico.
    console.error("[storage] falha ao enviar para o R2:", e);
    throw e;
  }

  // R2_PUBLIC_URL é o domínio público do bucket (custom domain ou
  // r2.dev habilitado no painel da Cloudflare), sem barra no final.
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "R2_PUBLIC_URL não configurada — necessária para gerar a URL pública do arquivo."
    );
  }
  return `${base}/${chave}`;
}

async function salvarLocal(
  bytes: Buffer,
  pastaBase: string,
  nomeArmazenado: string
): Promise<string> {
  const diretorio = path.join(process.cwd(), "public", "uploads", pastaBase);
  await mkdir(diretorio, { recursive: true });
  await writeFile(path.join(diretorio, nomeArmazenado), bytes);
  return `/uploads/${pastaBase}/${nomeArmazenado}`;
}

export async function salvarArquivo(
  arquivo: File,
  pastaBase: string
): Promise<{ url: string; nomeArmazenado: string }> {
  const bytes = Buffer.from(await arquivo.arrayBuffer());

  const extensao = path.extname(arquivo.name) || "";
  const nomeArmazenado = `${randomUUID()}${extensao}`;

  if (!r2Configurado && process.env.VERCEL) {
    throw new Error("ARMAZENAMENTO_NAO_CONFIGURADO");
  }

  const url = r2Configurado
    ? await salvarNoR2(
        bytes,
        `${pastaBase}/${nomeArmazenado}`,
        arquivo.type || "application/octet-stream"
      )
    : await salvarLocal(bytes, pastaBase, nomeArmazenado);

  return { url, nomeArmazenado };
}

/** Texto amigável (sem segredos) para o motivo mais provável da falha de armazenamento. */
export function descreverErroArmazenamento(e: unknown): string {
  const base = "Não foi possível salvar a imagem.";
  if (!(e instanceof Error)) return `${base} Tente novamente.`;
  const nome = `${e.name} ${e.message}`;
  if (e.message === "ARMAZENAMENTO_NAO_CONFIGURADO" || e.message.includes("R2_PUBLIC_URL")) {
    return "O armazenamento de fotos ainda não foi configurado no servidor.";
  }
  if (/InvalidAccessKeyId/i.test(nome)) return `${base} A chave de acesso do R2 (R2_ACCESS_KEY_ID) está incorreta.`;
  if (/SignatureDoesNotMatch/i.test(nome)) return `${base} A chave secreta do R2 (R2_SECRET_ACCESS_KEY) está incorreta.`;
  if (/AccessDenied|Forbidden/i.test(nome)) return `${base} A chave do R2 não tem permissão de escrita neste bucket.`;
  if (/NoSuchBucket/i.test(nome)) return `${base} O nome do bucket (R2_BUCKET_NAME) está incorreto.`;
  if (/ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(nome)) return `${base} O código da conta (R2_ACCOUNT_ID) parece incorreto.`;
  return `${base} Tente novamente.`;
}

/** Diagnóstico para o admin: confere as variáveis (sem mostrar valores) e tenta gravar um arquivo de teste. */
export async function diagnosticarArmazenamento() {
  const esperado: Record<string, number | null> = {
    R2_ACCOUNT_ID: 32,
    R2_ACCESS_KEY_ID: 32,
    R2_SECRET_ACCESS_KEY: 64,
    R2_BUCKET_NAME: null,
    R2_PUBLIC_URL: null,
  };
  const variaveis = Object.entries(esperado).map(([nome, tamanho]) => {
    const v = process.env[nome];
    return {
      nome,
      definida: !!v,
      tamanho: v?.length ?? 0,
      tamanhoEsperado: tamanho,
      espacosNasPontas: !!v && v !== v.trim(),
      comAspas: !!v && /^["'].*["']$/.test(v.trim()),
      terminaComBarra: nome === "R2_PUBLIC_URL" ? !!v && v.trim().endsWith("/") : false,
      pareceEndereco: nome === "R2_ACCOUNT_ID" ? !!v && /[:./]/.test(v) : false,
    };
  });

  let teste: { ok: boolean; detalhe: string };
  if (!r2Configurado) {
    teste = { ok: false, detalhe: "Variáveis R2 ausentes neste ambiente." };
  } else {
    try {
      await getS3Client().send(
        new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: "diagnostico/teste.txt", Body: Buffer.from("ok"), ContentType: "text/plain" })
      );
      teste = { ok: true, detalhe: "Gravação de teste concluída." };
    } catch (e) {
      teste = { ok: false, detalhe: e instanceof Error ? `${e.name}: ${e.message}` : "Erro desconhecido" };
    }
  }
  return { variaveis, teste, ambiente: process.env.VERCEL_ENV ?? "local" };
}
