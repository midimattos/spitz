import { prisma } from "@/lib/prisma";

export type ResultadoLimite = { ok: boolean; contagem: number; tentarEmSegundos: number };

/**
 * Conta uma tentativa para `chave` e diz se ainda está dentro do limite.
 * Atômico (um único comando SQL), então funciona em ambiente serverless
 * com várias instâncias. A janela reinicia quando expira.
 * Em caso de falha do banco, libera (fail-open): melhor não derrubar o login.
 */
export async function verificarLimite(chave: string, max: number, janelaSegundos: number): Promise<ResultadoLimite> {
  try {
    const linhas = await prisma.$queryRaw<{ contagem: number; expiraEm: Date }[]>`
      INSERT INTO "LimiteTaxa" ("chave", "contagem", "expiraEm")
      VALUES (${chave}, 1, NOW() + (${janelaSegundos} * INTERVAL '1 second'))
      ON CONFLICT ("chave") DO UPDATE SET
        "contagem" = CASE WHEN "LimiteTaxa"."expiraEm" < NOW() THEN 1 ELSE "LimiteTaxa"."contagem" + 1 END,
        "expiraEm" = CASE WHEN "LimiteTaxa"."expiraEm" < NOW() THEN NOW() + (${janelaSegundos} * INTERVAL '1 second') ELSE "LimiteTaxa"."expiraEm" END
      RETURNING "contagem", "expiraEm"`;
    const { contagem, expiraEm } = linhas[0];
    const restante = Math.max(0, Math.ceil((new Date(expiraEm).getTime() - Date.now()) / 1000));
    return { ok: contagem <= max, contagem, tentarEmSegundos: restante };
  } catch (erro) {
    console.error("[limite-taxa] falha", erro);
    return { ok: true, contagem: 0, tentarEmSegundos: 0 };
  }
}

/** Endereço IP de quem fez a requisição (a Vercel envia x-forwarded-for). */
export function ipDe(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? headers.get("x-real-ip") ?? "desconhecido").trim();
}

/** Mensagem amigável para o usuário. */
export function mensagemLimite(r: ResultadoLimite): string {
  const min = Math.ceil(r.tentarEmSegundos / 60);
  return `Muitas tentativas. Aguarde ${min <= 1 ? "1 minuto" : `${min} minutos`} e tente de novo.`;
}

/** Limpeza de linhas vencidas (chamada pela rotina diária). */
export async function limparLimites() {
  await prisma.limiteTaxa.deleteMany({ where: { expiraEm: { lt: new Date() } } }).catch(() => null);
}
