import { MODELO_IA, PROMPT_PEDIGREE, lerPedigreeAnthropic, type ResultadoLeituraPedigree } from "@/lib/anthropic";

// Escolha do provedor de IA para ler documentos.
//  - IA_PROVEDOR=anthropic | gemini   (força um deles)
//  - sem IA_PROVEDOR: usa a Anthropic se houver ANTHROPIC_API_KEY, senão o Gemini se houver GEMINI_API_KEY.
// O Gemini gratuito serve só para TESTE: o plano gratuito pode usar o conteúdo enviado para melhorar
// produtos do Google. Para uso real com clientes, use um plano pago.

export type Provedor = "anthropic" | "gemini";

export const MODELO_GEMINI = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export function provedorAtivo(): Provedor | null {
  const forcado = process.env.IA_PROVEDOR?.toLowerCase();
  if (forcado === "gemini") return process.env.GEMINI_API_KEY ? "gemini" : null;
  if (forcado === "anthropic") return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

async function chamarGemini(partes: unknown[], maxTokens: number): Promise<{ ok: true; texto: string } | { ok: false; detalhe: string }> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: partes }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0 },
      }),
    });
    const corpo = await res.text();
    if (!res.ok) {
      let msg = "";
      try {
        msg = JSON.parse(corpo)?.error?.message ?? "";
      } catch {
        /* texto puro */
      }
      return { ok: false, detalhe: `Gemini ${res.status}${msg ? `: ${msg.slice(0, 200)}` : ""}` };
    }
    const dados = JSON.parse(corpo);
    const texto = (dados.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    if (!texto) return { ok: false, detalhe: "Gemini respondeu sem texto" };
    return { ok: true, texto };
  } catch (erro) {
    return { ok: false, detalhe: `Falha de rede: ${erro instanceof Error ? erro.message : "erro"}` };
  }
}

async function lerPedigreeGemini(base64: string, mediaType: string): Promise<ResultadoLeituraPedigree> {
  const r = await chamarGemini([{ inline_data: { mime_type: mediaType, data: base64 } }, { text: PROMPT_PEDIGREE }], 8192);
  if (!r.ok) {
    console.error("[pedigree-ia]", r.detalhe);
    return { ok: false, motivo: "falha", detalhe: r.detalhe };
  }
  const inicio = r.texto.indexOf("{");
  const fim = r.texto.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return { ok: false, motivo: "ilegivel" };
  try {
    return { ok: true, arvore: JSON.parse(r.texto.slice(inicio, fim + 1)) };
  } catch {
    return { ok: false, motivo: "ilegivel" };
  }
}

/** Lê um pedigree com o provedor configurado. */
export async function lerPedigreeComIA(base64: string, mediaType: string): Promise<ResultadoLeituraPedigree> {
  const p = provedorAtivo();
  if (!p) return { ok: false, motivo: "sem-chave" };
  return p === "gemini" ? lerPedigreeGemini(base64, mediaType) : lerPedigreeAnthropic(base64, mediaType);
}

export type ResultadoTeste = { provedor: Provedor | "nenhum"; modelo: string; ok: boolean; detalhe: string };

/** Chamada mínima, só de texto (custa uma fração de centavo), para conferir chave, crédito e modelo. */
export async function testarConexaoIA(qual?: Provedor): Promise<ResultadoTeste> {
  const p = qual ?? provedorAtivo();
  if (!p) return { provedor: "nenhum", modelo: "—", ok: false, detalhe: "Nenhuma chave configurada (ANTHROPIC_API_KEY ou GEMINI_API_KEY)." };
  if (p === "gemini") {
    if (!process.env.GEMINI_API_KEY) return { provedor: p, modelo: MODELO_GEMINI, ok: false, detalhe: "GEMINI_API_KEY não definida." };
    const r = await chamarGemini([{ text: "Responda apenas com a palavra: ok" }], 16);
    return { provedor: p, modelo: MODELO_GEMINI, ok: r.ok, detalhe: r.ok ? `Resposta: ${r.texto.trim().slice(0, 40)}` : r.detalhe };
  }
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return { provedor: p, modelo: MODELO_IA, ok: false, detalhe: "ANTHROPIC_API_KEY não definida." };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODELO_IA, max_tokens: 16, messages: [{ role: "user", content: "Responda apenas com a palavra: ok" }] }),
    });
    const corpo = await res.text();
    if (!res.ok) {
      let msg = "";
      try {
        msg = JSON.parse(corpo)?.error?.message ?? "";
      } catch {
        /* texto puro */
      }
      return { provedor: p, modelo: MODELO_IA, ok: false, detalhe: `Anthropic ${res.status}${msg ? `: ${msg.slice(0, 200)}` : ""}` };
    }
    const texto = (JSON.parse(corpo).content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
    return { provedor: p, modelo: MODELO_IA, ok: true, detalhe: `Resposta: ${texto.trim().slice(0, 40)}` };
  } catch (erro) {
    return { provedor: p, modelo: MODELO_IA, ok: false, detalhe: `Falha de rede: ${erro instanceof Error ? erro.message : "erro"}` };
  }
}
