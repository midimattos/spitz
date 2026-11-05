import { timingSafeEqual } from "node:crypto";
import type { PlanoId } from "@/lib/assinatura";

/**
 * Cobrança automática pelo Asaas.
 * Variáveis: ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN, ASAAS_AMBIENTE ("producao" ou vazio = sandbox),
 * opcional ASAAS_CHECKOUT_URL para sobrescrever o endereço da tela de pagamento.
 */

export function provedorDePagamento(): "asaas" | "mercadopago" {
  return process.env.PAGAMENTO_PROVEDOR === "mercadopago" ? "mercadopago" : "asaas";
}

export function asaasConfigurado(): boolean {
  return !!process.env.ASAAS_API_KEY;
}

function producao(): boolean {
  return process.env.ASAAS_AMBIENTE === "producao";
}

function baseApi(): string {
  return producao() ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export function urlDoCheckout(id: string): string {
  const base =
    process.env.ASAAS_CHECKOUT_URL ??
    (producao() ? "https://asaas.com/checkoutSession/show" : "https://sandbox.asaas.com/checkoutSession/show");
  return `${base}?id=${encodeURIComponent(id)}`;
}

export const CICLO_DO_PLANO: Record<PlanoId, "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY"> = {
  MENSAL: "MONTHLY",
  TRIMESTRAL: "QUARTERLY",
  SEMESTRAL: "SEMIANNUALLY",
  ANUAL: "YEARLY",
};

async function chamar<T>(metodo: "GET" | "POST" | "DELETE", caminho: string, corpo?: unknown): Promise<T> {
  const res = await fetch(`${baseApi()}${caminho}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      access_token: process.env.ASAAS_API_KEY ?? "",
      "User-Agent": "spitz-saas",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    throw new Error(`Asaas ${metodo} ${caminho} falhou (${res.status}): ${texto.slice(0, 300)}`);
  }
  return (await res.json().catch(() => ({}))) as T;
}

function agoraAsaas(): string {
  // Fuso de Brasília (UTC-3), formato "AAAA-MM-DD HH:mm:ss"
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export async function criarCheckoutAssinatura(dados: {
  referencia: string;
  titulo: string;
  descricao: string;
  valor: number;
  plano: PlanoId;
  nome: string;
  email: string;
  urlSucesso: string;
  urlCancelado: string;
  urlExpirado: string;
}): Promise<{ id: string }> {
  const r = await chamar<{ id: string }>("POST", "/checkouts", {
    billingTypes: ["CREDIT_CARD"],
    chargeTypes: ["RECURRENT"],
    minutesToExpire: 60,
    externalReference: dados.referencia,
    callback: { successUrl: dados.urlSucesso, cancelUrl: dados.urlCancelado, expiredUrl: dados.urlExpirado },
    items: [{ name: dados.titulo, description: dados.descricao, quantity: 1, value: dados.valor }],
    customerData: { name: dados.nome, email: dados.email },
    subscription: { cycle: CICLO_DO_PLANO[dados.plano], nextDueDate: agoraAsaas() },
  });
  if (!r?.id) throw new Error("Asaas não devolveu o id do checkout");
  return r;
}

export async function buscarClienteAsaas(id: string): Promise<{ id: string; email?: string; externalReference?: string | null }> {
  return chamar("GET", `/customers/${encodeURIComponent(id)}`);
}

export async function cancelarAssinaturaAsaas(id: string): Promise<void> {
  await chamar("DELETE", `/subscriptions/${encodeURIComponent(id)}`);
}

/** Confere o token enviado pelo Asaas no cabeçalho asaas-access-token. */
export function tokenDoWebhookValido(recebido: string | null): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
