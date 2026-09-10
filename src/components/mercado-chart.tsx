"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Dado = { porte: string; desejosAtivos: number; anunciosPublicados: number };

export function MercadoChart({ dados }: { dados: Dado[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="porte" tick={{ fontSize: 12, fill: "var(--ink-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--ink-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "var(--parchment-card)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 4,
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="desejosAtivos" name="Demanda (desejos ativos)" fill="var(--brass)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="anunciosPublicados" name="Oferta (anúncios publicados)" fill="var(--pine)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
