/** Lê um valor em reais digitado pelo criador: "1500", "1.500", "1.500,50", "R$ 1500,5". */
export function lerValor(texto: string | null | undefined): number | undefined {
  const t = (texto ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
  if (!t) return undefined;
  let n: string;
  if (t.includes(",")) n = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) n = t.replace(/\./g, "");
  else n = t;
  if (!/^\d+(\.\d+)?$/.test(n)) return undefined;
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : undefined;
}

/** "2026-03-10" (campo de data) -> ISO no meio-dia UTC, para não virar o dia anterior no fuso do Brasil. */
export function dataParaIso(yyyyMmDd: string): string {
  return new Date(`${yyyyMmDd}T12:00:00.000Z`).toISOString();
}
