"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import type { LinhaMes } from "@/lib/relatorio-financeiro";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function GraficoFinanceiro({ dados }: { dados: LinhaMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
        <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: "var(--ink-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--ink-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
        <Tooltip
          formatter={(v) => brl(Number(v))}
          contentStyle={{ background: "var(--parchment-card)", border: "1px solid var(--border-hairline)", borderRadius: 4, fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="receita" name="Receitas" fill="#1e3a2f" radius={[3, 3, 0, 0]} />
        <Bar dataKey="despesa" name="Despesas" fill="#b5523b" radius={[3, 3, 0, 0]} />
        <Bar dataKey="investimento" name="Investimentos" fill="#a06a2e" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
