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
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: chave,
      Body: bytes,
      ContentType: contentType,
    })
  );

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

  const url = r2Configurado
    ? await salvarNoR2(
        bytes,
        `${pastaBase}/${nomeArmazenado}`,
        arquivo.type || "application/octet-stream"
      )
    : await salvarLocal(bytes, pastaBase, nomeArmazenado);

  return { url, nomeArmazenado };
}
