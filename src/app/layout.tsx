import type { Metadata } from "next";
import "./globals.css";
import { BarraNavegacao } from "@/components/barra-navegacao";
import { RodapeLegal } from "@/components/rodape-legal";

export const metadata: Metadata = {
  title: "Plataforma Spitz Alemão | Marketplace e gestão de canil",
  description:
    "Marketplace do Spitz Alemão e SaaS de gestão de canil: genética, precificação e dossiê digital.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <BarraNavegacao />
        {children}
        <RodapeLegal />
      </body>
    </html>
  );
}
