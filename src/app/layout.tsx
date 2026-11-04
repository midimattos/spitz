import type { Metadata } from "next";
import "./globals.css";
import { BarraNavegacao } from "@/components/barra-navegacao";
import { RodapeLegal } from "@/components/rodape-legal";
import { Cabecalho } from "@/components/cabecalho";
import { auth, signOut } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Spitz Alemão | Gestão completa do seu canil",
  description:
    "Gestão de canil: plantel, pedigree, genética de cor, ninhadas, financeiro e saúde em um só lugar.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  async function sair() {
    "use server";
    await signOut({ redirectTo: "/" });
  }
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Cabecalho
          usuario={session?.user ? { nome: session.user.name ?? session.user.email ?? "", papel: session.user.role } : null}
          sair={sair}
        />
        <BarraNavegacao />
        {children}
        <RodapeLegal />
      </body>
    </html>
  );
}
