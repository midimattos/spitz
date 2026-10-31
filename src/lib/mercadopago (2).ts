import { createHmac, timingSafeEqual } from "crypto";

const MP_API = "https://api.mercadopago.com";

export function mercadoPagoConfigurado(): boolean {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN;
}

type ItemPreferencia = {
  titulo: string;
  valor: number;
  quantidade?: number;
};

type CriarPreferenciaInput = {
  item: ItemPreferencia;
  referenciaExterna: string; // usamos o id do nosso Pagamento
  urlRetornoSucesso: string;
  urlRetornoFalha: string;
};

type PreferenciaMP = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
};

/**
 * Cria uma preferência de pagamento no Mercado Pago (Checkout Pro) e
 * retorna a URL para redirecionar o usuário ao checkout hospedado por
 * eles. Não processa cartão nem dado sensível no nosso servidor — é o
 * Mercado Pago quem cuida disso.
 */
export async function criarPreferenciaPagamento(
  input: CriarPreferenciaInput
): Promise<PreferenciaMP> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  }

  const baseUrl = process.env.NEXTAUTH_URL;

  const response = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [
        {
          id: input.referenciaExterna,
          title: input.item.titulo,
          quantity: input.item.quantidade ?? 1,
          currency_id: "BRL",
          unit_price: input.item.valor,
        },
      ],
      external_reference: input.referenciaExterna,
      back_urls: {
        success: input.urlRetornoSucesso,
        pending: input.urlRetornoSucesso,
        failure: input.urlRetornoFalha,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    }),
  });

  if (!response.ok) {
    const texto = await response.text();
    throw new Error(`Erro ao criar preferência no Mercado Pago: ${texto}`);
  }

  return response.json();
}

export type PagamentoMP = {
  id: number;
  status: "approved" | "pending" | "rejected" | "cancelled" | "in_process" | string;
  external_reference: string | null;
};

export async function buscarPagamentoMP(paymentId: string): Promise<PagamentoMP> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");

  const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar pagamento ${paymentId} no Mercado Pago`);
  }

  return response.json();
}

/**
 * Valida o header `x-signature` do webhook do Mercado Pago, seguindo o
 * formato deles: `ts=...,v1=...`, onde v1 é o HMAC-SHA256 (hex) de
 * `id:{dataId};request-id:{xRequestId};ts:{ts};` usando o segredo
 * configurado em "Suas integrações" > Webhooks no painel do Mercado Pago.
 *
 * Se `MERCADOPAGO_WEBHOOK_SECRET` não estiver configurado, retorna false
 * — sem o segredo não há como validar, então o chamador deve tratar a
 * notificação como não confiável (e não aplicar nenhum benefício).
 */
export function validarAssinaturaWebhook(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !xSignature) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((parte) => {
      const [chave, valor] = parte.split("=");
      return [chave?.trim(), valor?.trim()];
    })
  );

  const ts = partes.ts;
  const hashRecebido = partes.v1;
  if (!ts || !hashRecebido) return false;

  const manifesto = `id:${dataId.toLowerCase()};request-id:${xRequestId ?? ""};ts:${ts};`;
  const hashCalculado = createHmac("sha256", secret).update(manifesto).digest("hex");

  const bufferRecebido = Buffer.from(hashRecebido);
  const bufferCalculado = Buffer.from(hashCalculado);
  if (bufferRecebido.length !== bufferCalculado.length) return false;

  return timingSafeEqual(bufferRecebido, bufferCalculado);
}
