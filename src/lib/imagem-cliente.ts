// Reduz a foto no navegador antes de enviar. Fotos de celular passam de 5 MB,
// e a Vercel recusa envios acima de ~4,5 MB; assim a foto sobe leve e rápida.

export async function prepararImagem(arquivo: File, ladoMax = 1800, qualidade = 0.85): Promise<File> {
  if (!arquivo.type.startsWith("image/") || arquivo.type === "image/gif") return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", qualidade));
    if (!blob || blob.size >= arquivo.size) return arquivo.size > 4_000_000 && blob ? novo(blob, arquivo) : arquivo;
    return novo(blob, arquivo);
  } catch {
    return arquivo;
  }
}

function novo(blob: Blob, original: File): File {
  const nome = original.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], nome, { type: "image/jpeg" });
}

/** Lê a resposta de erro sem quebrar quando o servidor devolve texto/HTML. */
export async function mensagemDeErro(res: Response, padrao: string): Promise<string> {
  if (res.status === 413) return "A imagem é grande demais. Tente uma foto menor.";
  try {
    const data = await res.json();
    return data.error ?? padrao;
  } catch {
    return padrao;
  }
}
