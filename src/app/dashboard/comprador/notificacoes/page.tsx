import { auth } from "@/lib/auth";
import { ListaNotificacoes } from "@/components/lista-notificacoes";

export default async function NotificacoesCompradorPage() {
  const session = await auth();

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Avisos
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Atualizações sobre o seu cadastro e os seus interesses.
      </p>
      {session?.user && <ListaNotificacoes userId={session.user.id} />}
    </main>
  );
}
