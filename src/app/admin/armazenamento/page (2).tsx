import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { diagnosticarArmazenamento } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ArmazenamentoPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") notFound();
  const d = await diagnosticarArmazenamento();

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 sm:px-8 py-12">
      <Link href="/admin" className="text-sm underline" style={{ color: "var(--brass)" }}>← Admin</Link>
      <h1 className="font-display text-3xl mt-2" style={{ color: "var(--pine)" }}>Diagnóstico do armazenamento de fotos</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>Ambiente: {d.ambiente}. Os valores das variáveis nunca são exibidos, só o tamanho e problemas de formato.</p>

      <div className="card mt-6 p-6">
        <table className="w-full text-sm">
          <thead><tr className="text-left" style={{ color: "var(--ink-muted)" }}><th className="py-1">Variável</th><th>Definida</th><th>Tamanho</th><th>Problemas</th></tr></thead>
          <tbody>
            {d.variaveis.map((v) => {
              const problemas = [
                !v.definida && "não definida",
                v.espacosNasPontas && "espaço no começo ou no fim",
                v.comAspas && "valor entre aspas",
                v.terminaComBarra && "termina com barra",
                v.pareceEndereco && "parece um endereço; use só o código",
                v.definida && v.tamanhoEsperado && v.tamanho !== v.tamanhoEsperado && `deveria ter ${v.tamanhoEsperado} caracteres`,
              ].filter(Boolean) as string[];
              return (
                <tr key={v.nome} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                  <td className="py-1.5 font-mono text-xs">{v.nome}</td>
                  <td>{v.definida ? "sim" : "não"}</td>
                  <td>{v.definida ? v.tamanho : "—"}</td>
                  <td style={{ color: problemas.length ? "#a32d2d" : "var(--pine)" }}>{problemas.length ? problemas.join("; ") : "ok"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card mt-6 p-6 text-sm">
        <p className="font-medium" style={{ color: "var(--pine)" }}>Para conferir com o Cloudflare</p>
        <ul className="mt-2 space-y-1" style={{ color: "var(--ink-muted)" }}>
          <li>Access Key ID em uso: <span className="font-mono">{d.pistas.accessKeyId || "—"}</span></li>
          <li>Segredo em uso começa e termina com: <span className="font-mono">{d.pistas.segredoPontas || "—"}</span></li>
          <li>Bucket: <span className="font-mono">{d.pistas.bucket || "—"}</span></li>
        </ul>
        <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>O Access Key ID e o segredo precisam ser do mesmo token, criado na mesma tela.</p>
      </div>

      <div className="card mt-6 p-6 text-sm">
        <p className="font-medium" style={{ color: d.teste.ok ? "var(--pine)" : "#a32d2d" }}>
          Teste de gravação: {d.teste.ok ? "funcionou" : "falhou"}
        </p>
        <p className="mt-1 break-words" style={{ color: "var(--ink-muted)" }}>{d.teste.detalhe}</p>
      </div>
    </main>
  );
}
