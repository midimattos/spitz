/** Modelo usado nas leituras por IA. Pode ser trocado pela variável ANTHROPIC_MODEL. */
export const MODELO_IA = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

const PROMPT_EXTRACAO = `Você recebeu um laudo de exame genético (DNA) de um cão, em PDF.
Extraia as informações e responda APENAS com um JSON válido, sem nenhum texto
antes ou depois, no seguinte formato:

{
  "laboratorio": "nome do laboratório, ou null se não identificar",
  "dataLaudo": "AAAA-MM-DD, ou null se não identificar",
  "resultados": [
    { "condicao": "nome da condição/doença testada", "status": "LIVRE" | "PORTADOR" | "AFETADO" }
  ]
}

Regras:
- "status" deve ser sempre um destes três valores, traduzindo o resultado do laudo:
  LIVRE (clear/negative/normal), PORTADOR (carrier/heterozygous), AFETADO (affected/at risk/homozygous).
- Se não conseguir identificar nenhum resultado, responda com "resultados": [].
- Não invente condições que não estejam explicitamente no laudo.`;

type ExtracaoLaudo = {
  laboratorio: string | null;
  dataLaudo: string | null;
  resultados: { condicao: string; status: "LIVRE" | "PORTADOR" | "AFETADO" }[];
};

/**
 * Envia o PDF do laudo para a API da Claude e pede uma extração
 * estruturada dos resultados. Retorna null em caso de falha (sem
 * ANTHROPIC_API_KEY configurada, erro de rede, resposta inválida etc.) —
 * o chamador deve tratar isso como "extração indisponível, preencha
 * manualmente", nunca como erro fatal.
 */
export async function extrairLaudoComIA(pdfBase64: string): Promise<ExtracaoLaudo | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO_IA,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              { type: "text", text: PROMPT_EXTRACAO },
            ],
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const textoResposta = data.content
      ?.filter((bloco: { type: string }) => bloco.type === "text")
      .map((bloco: { text: string }) => bloco.text)
      .join("");

    if (!textoResposta) return null;

    const jsonLimpo = textoResposta.replace(/```json|```/g, "").trim();
    const extraido = JSON.parse(jsonLimpo) as ExtracaoLaudo;

    return extraido;
  } catch {
    return null;
  }
}

const PROMPT_PEDIGREE = `Você recebeu a foto ou o PDF de um PEDIGREE brasileiro de cão (CBKC/FCI), no formato de árvore genealógica.
Leia o documento e responda APENAS com um JSON válido, sem texto antes ou depois.

Formato (cada cão é um objeto; "pai" e "mae" repetem o mesmo formato, de forma aninhada):
{
  "nome": "nome do cão",
  "registro": "número de registro (ex: RG/SPAI/22/08293), ou null",
  "cor": "cor escrita no documento (ex: BRANCO, PARTICOLOR), ou null",
  "microchip": "número do microchip, ou null",
  "nascimento": "AAAA-MM-DD, ou null",
  "criador": "nome do criador, ou null",
  "sexo": "MACHO" ou "FEMEA" (só para o cão principal),
  "pai": { ... mesmo formato ... } ou null,
  "mae": { ... mesmo formato ... } ou null
}

Como ler o documento:
- O cabeçalho (nome, raça, nascimento, microchip, registro, sexo, cor, criador) descreve o cão principal.
- A árvore tem o PAI do cão principal na metade de cima e a MÃE na metade de baixo; cada geração se divide da mesma forma
  (o ancestral de cima é sempre o pai daquele cão, o de baixo é a mãe).
- Cada ancestral aparece com nome, número de registro (RG, BR, KCT, ZY...), microchip e cor, quando houver.
- Copie nomes e números EXATAMENTE como estão escritos; não corrija, não traduza e não invente.
- Se um dado estiver ilegível ou ausente, use null. Se um ancestral não existir no documento, use null.
- Inclua todas as gerações que aparecem no documento.`;

export type ResultadoLeituraPedigree =
  | { ok: true; arvore: unknown }
  | { ok: false; motivo: "sem-chave" | "falha" | "ilegivel" };

/** Lê um pedigree (imagem ou PDF) e devolve a árvore bruta; quem chama deve normalizá-la. */
export async function lerPedigreeComIA(base64: string, mediaType: string): Promise<ResultadoLeituraPedigree> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, motivo: "sem-chave" };
  const arquivo =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODELO_IA,
        max_tokens: 4096,
        messages: [{ role: "user", content: [arquivo, { type: "text", text: PROMPT_PEDIGREE }] }],
      }),
    });
    if (!response.ok) {
      console.error("[pedigree-ia] API respondeu", response.status, await response.text().catch(() => ""));
      return { ok: false, motivo: "falha" };
    }
    const data = await response.json();
    const resposta = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
    const inicio = resposta.indexOf("{");
    const fim = resposta.lastIndexOf("}");
    if (inicio < 0 || fim <= inicio) return { ok: false, motivo: "ilegivel" };
    return { ok: true, arvore: JSON.parse(resposta.slice(inicio, fim + 1)) };
  } catch (erro) {
    console.error("[pedigree-ia] falha", erro);
    return { ok: false, motivo: "falha" };
  }
}
