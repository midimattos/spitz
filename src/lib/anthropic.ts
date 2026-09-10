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
        model: "claude-sonnet-5",
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
