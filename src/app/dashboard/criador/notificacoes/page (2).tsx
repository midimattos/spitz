import { auth } from "@/lib/auth";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { gerarAlertasDoCanil } from "@/lib/alertas";
import { ListaNotificacoes } from "@/components/lista-notificacoes";

export default async function NotificacoesCriadorPage() {
  const session = await auth();
  const canil = await getCanilDoCriadorLogado();

  // Garante que os avisos automáticos (cio, parto, vacinas…) estejam em dia
  // mesmo antes da rotina diária rodar. Não duplica: cada aviso tem chave única.
  if (canil) {
    try {
      await gerarAlertasDoCanil(canil);
    } catch (erro) {
      console.error("[notificacoes] falha ao gerar alertas", erro);
    }
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Avisos
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Cio, partos, vacinas, mensagens, interessados e anúncios parados.
      </p>
      {session?.user && <ListaNotificacoes userId={session.user.id} />}
    </main>
  );
}
