import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/labels";
import { AdminSugestaoLida } from "@/components/admin-sugestao-lida";

export default async function SugestoesAdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();
  const sugestoes = await prisma.sugestao.findMany({ orderBy: [{ lida: "asc" }, { criadoEm: "desc" }], take: 300 });
  const novas = sugestoes.filter((s) => !s.lida).length;

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 sm:px-8 py-12">
      <Link href="/admin" className="text-sm underline" style={{ color: "var(--brass)" }}>← Administração</Link>
      <h1 className="font-display text-3xl mt-3" style={{ color: "var(--pine)" }}>Sugestões dos criadores</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        {novas} nova{novas === 1 ? "" : "s"} · o que eles sentem falta, para orientar as próximas novidades.
      </p>
      <div className="mt-6 space-y-3">
        {sugestoes.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nenhuma sugestão ainda.</p>}
        {sugestoes.map((s) => (
          <div key={s.id} className="card p-4" style={{ opacity: s.lida ? 0.65 : 1 }}>
            <p className="text-sm whitespace-pre-wrap">{s.texto}</p>
            <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
              {s.autorNome || s.autorEmail}{s.canilNome ? ` · ${s.canilNome}` : ""} · {formatarData(s.criadoEm)}{s.pagina ? ` · na tela ${s.pagina}` : ""}
            </p>
            <div className="mt-2"><AdminSugestaoLida id={s.id} lida={s.lida} /></div>
          </div>
        ))}
      </div>
    </main>
  );
}
