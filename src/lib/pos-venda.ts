import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/notificacoes";

// Lembretes ao comprador, em nome do canil, conforme a idade do filhote.
const MARCOS = [
  { id: "V1", dias: 45, titulo: "primeira vacina (múltipla)", texto: "Nessa idade costuma-se aplicar a primeira dose da vacina múltipla e iniciar a vermifugação, se ainda não feitas." },
  { id: "V2", dias: 70, titulo: "segunda vacina", texto: "Está chegando a segunda dose da vacina múltipla (cerca de 21 a 30 dias após a primeira)." },
  { id: "V3", dias: 100, titulo: "terceira vacina", texto: "É hora da terceira dose da vacina múltipla, conforme orientação do seu veterinário." },
  { id: "RAIVA", dias: 120, titulo: "vacina antirrábica", texto: "A partir dos 4 meses aplica-se a vacina antirrábica. Converse com seu veterinário sobre as datas." },
];
const JANELA_DIAS = 10; // só envia se ainda está perto do marco

export async function processarPosVenda(base: string): Promise<number> {
  const vendas = await prisma.vendaRegistro.findMany({
    where: { compradorEmail: { not: null }, anuncio: { cao: { dataNascimento: { not: null } } } },
    include: { canil: { select: { nome: true } }, anuncio: { include: { cao: true } }, posVendaEnvios: true },
    take: 500,
    orderBy: { dataVenda: "desc" },
  });
  const agora = Date.now();
  let enviados = 0;

  for (const v of vendas) {
    const nasc = v.anuncio?.cao.dataNascimento;
    if (!nasc || !v.compradorEmail) continue;
    const idade = Math.floor((agora - nasc.getTime()) / 86_400_000);
    for (const m of MARCOS) {
      if (idade < m.dias - 3 || idade > m.dias + JANELA_DIAS) continue;
      if (v.posVendaEnvios.some((e) => e.marco === m.id)) continue;
      try {
        await prisma.posVendaEnvio.create({ data: { vendaId: v.id, marco: m.id } });
      } catch {
        continue;
      }
      const nome = v.compradorNome ? v.compradorNome.split(" ")[0] : "";
      await enviarEmail(
        v.compradorEmail,
        `${v.anuncio!.cao.nome}: lembrete de ${m.titulo}`,
        [
          `Olá${nome ? `, ${nome}` : ""}!`,
          "",
          `${v.anuncio!.cao.nome} está com cerca de ${idade} dias. ${m.texto}`,
          "",
          `Mensagem enviada em nome do canil ${v.canil.nome}. Este é um lembrete geral e não substitui a orientação do seu médico-veterinário.`,
          base ? `Certificado do filhote e dúvidas: ${base}` : "",
        ].filter(Boolean).join("\n")
      );
      enviados++;
    }
  }
  return enviados;
}
