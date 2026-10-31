import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Normaliza um celular brasileiro para o formato internacional só com dígitos
 * (55 + DDD + 9 dígitos). Retorna null se não parecer um celular válido.
 */
export function normalizarCelularBR(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("0055")) d = d.slice(2);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 10) {
    // celular antigo sem o nono dígito: DDD + 8 dígitos começando em 6-9
    if (!/^[6-9]/.test(d.slice(2))) return null;
    d = d.slice(0, 2) + "9" + d.slice(2);
  }
  if (d.length !== 11) return null;
  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99 || d[2] !== "9") return null;
  return `55${d}`;
}

export function formatarCelular(n: string): string {
  const d = n.replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : n;
}

export function whatsappConfigurado(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

export function gerarCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashDoCodigo(userId: string, numero: string, codigo: string): string {
  return createHash("sha256").update(`${userId}:${numero}:${codigo}`).digest("hex");
}

export const identificadorWhatsapp = (userId: string) => `wpp:${userId}`;

/**
 * Envia o código pela API oficial do WhatsApp (Meta Cloud API), usando um modelo
 * de mensagem de AUTENTICAÇÃO aprovado (nome em WHATSAPP_TEMPLATE, idioma em
 * WHATSAPP_TEMPLATE_IDIOMA). Retorna true se a Meta aceitou o envio.
 */
export async function enviarCodigoWhatsapp(numero: string, codigo: string): Promise<boolean> {
  if (!whatsappConfigurado()) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: numero,
        type: "template",
        template: {
          name: process.env.WHATSAPP_TEMPLATE ?? "codigo_verificacao",
          language: { code: process.env.WHATSAPP_TEMPLATE_IDIOMA ?? "pt_BR" },
          components: [
            { type: "body", parameters: [{ type: "text", text: codigo }] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: codigo }] },
          ],
        },
      }),
    });
    if (!res.ok) console.error("[whatsapp] envio recusado", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (erro) {
    console.error("[whatsapp] falha", erro);
    return false;
  }
}

export type SituacaoContato = {
  emailOk: boolean;
  whatsappOk: boolean;
  /** WhatsApp só é exigido quando o envio automático está configurado (senão ninguém conseguiria). */
  exigeWhatsapp: boolean;
  liberado: boolean;
};

export async function situacaoDoContato(userId: string): Promise<SituacaoContato> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true, whatsappVerificadoEm: true } });
  const emailOk = !!u?.emailVerified;
  const whatsappOk = !!u?.whatsappVerificadoEm;
  const exigeWhatsapp = whatsappConfigurado() || process.env.EXIGIR_WHATSAPP === "true";
  return { emailOk, whatsappOk, exigeWhatsapp, liberado: emailOk && (!exigeWhatsapp || whatsappOk) };
}

export function mensagemContatoPendente(s: SituacaoContato): string {
  const falta = [!s.emailOk && "e-mail", s.exigeWhatsapp && !s.whatsappOk && "WhatsApp"].filter(Boolean).join(" e ");
  return `Para publicar anúncios, confirme seu ${falta} em "Minha conta".`;
}
