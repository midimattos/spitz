import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/notificacoes";
import { avaliarAnuncio } from "@/lib/busca";
import { LABEL_SEXO } from "@/lib/labels";

/**
 * Quando um anúncio é publicado pela primeira vez: avisa por e-mail
 *  - quem está na lista de espera daquele canil;
 *  - compradores cujo desejo combina com o filhote (todos os critérios preenchidos).
 * Cada pessoa recebe no máximo um aviso por anúncio. Falhas nunca travam a publicação.
 */
export async function alertarNovoAnuncio(anuncioId: string, base: string): Promise<void> {
  try {
    const a = await prisma.anuncio.findUnique({ where: { id: anuncioId }, include: { cao: true, canil: true } });
    if (!a || a.status !== "PUBLICADO" || !a.canil.verificado) return;

    const link = `${base}/marketplace/${a.id}`;
    const resumo = [a.cao.corBase, LABEL_SEXO[a.cao.sexo], a.cao.porte].filter(Boolean).join(" · ");
    const enviados = new Set<string>();

    async function avisar(email: string, nome: string | null, origem: "LISTA_ESPERA" | "BUSCA", abertura: string) {
      const chave = email.toLowerCase();
      if (enviados.has(chave)) return;
      enviados.add(chave);
      try {
        await prisma.avisoAnuncio.create({ data: { anuncioId: a!.id, email: chave, origem } });
      } catch {
        return; // já avisado antes
      }
      await enviarEmail(
        email,
        `Novo filhote: ${a!.titulo}`,
        [`Olá${nome ? `, ${nome.split(" ")[0]}` : ""}!`, "", abertura, resumo ? `(${resumo})` : "", "", `Ver o anúncio: ${link}`].filter((l) => l !== "").join("\n")
      );
    }

    const espera = await prisma.listaEspera.findMany({ where: { canilId: a.canilId } });
    for (const e of espera) {
      await avisar(e.email, e.nome, "LISTA_ESPERA", `O canil ${a.canil.nome}, em cuja lista de espera você está, acabou de anunciar um filhote.`);
    }

    const desejos = await prisma.desejoComprador.findMany({ where: { ativo: true }, include: { user: { select: { email: true, name: true } } } });
    for (const d of desejos) {
      if (!d.user.email) continue;
      const filtros = {
        porte: d.porte ?? undefined,
        sexo: d.sexo ?? undefined,
        corBase: d.corBase ?? undefined,
        marcacao: d.marcacao ?? undefined,
        diluicao: d.diluicao ?? undefined,
        merle: d.merle ?? undefined,
        precoMin: d.precoMin ? Number(d.precoMin) : undefined,
        precoMax: d.precoMax ? Number(d.precoMax) : undefined,
        estado: d.estado ?? undefined,
        cidade: d.cidade ?? undefined,
      };
      const c = avaliarAnuncio(filtros, a.cao, a.canil, Number(a.preco));
      if (c.total > 0 && c.naoCasam.length === 0) {
        await avisar(d.user.email, d.user.name, "BUSCA", "Saiu um filhote que combina com o que você procura.");
      }
    }
  } catch (erro) {
    console.error("[avisos-anuncio] falha", erro);
  }
}
