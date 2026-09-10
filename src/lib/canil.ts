import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Retorna o canil do criador logado, ou null se não houver sessão
 * autenticada com papel CRIADOR ou se, por algum motivo, o canil
 * ainda não existir.
 */
export async function getCanilDoCriadorLogado() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CRIADOR") return null;

  const canil = await prisma.canil.findUnique({
    where: { ownerId: session.user.id },
  });

  return canil;
}
