import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { salvarArquivo, descreverErroArmazenamento } from "@/lib/storage";
import { nomeMaiusculo } from "@/lib/texto";

const texto = (v: FormDataEntryValue | null, max: number) => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s || null;
};

/** Cadastra um filhote já tido por este cão (foto opcional). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id } = await params;
  const cao = await prisma.cao.findFirst({ where: { id, canilId: canil.id }, select: { id: true } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const fd = await request.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const nome = texto(fd.get("nome"), 120);
  if (!nome) return NextResponse.json({ error: "Informe o nome do filhote." }, { status: 400 });

  const nasc = texto(fd.get("dataNascimento"), 10);
  if (nasc && !/^\d{4}-\d{2}-\d{2}$/.test(nasc)) return NextResponse.json({ error: "Data de nascimento inválida." }, { status: 400 });

  let fotoUrl: string | null = null;
  const arquivo = fd.get("foto");
  if (arquivo instanceof File && arquivo.size > 0) {
    if (!arquivo.type.startsWith("image/")) return NextResponse.json({ error: "A foto precisa ser uma imagem." }, { status: 400 });
    try {
      ({ url: fotoUrl } = await salvarArquivo(arquivo, `descendentes/${cao.id}`));
    } catch (e) {
      return NextResponse.json({ error: descreverErroArmazenamento(e) }, { status: 500 });
    }
  }

  const tutorNome = texto(fd.get("tutorNome"), 120);
  const criado = await prisma.descendente.create({
    data: {
      caoId: cao.id,
      nome: nomeMaiusculo(nome),
      dataNascimento: nasc ? new Date(`${nasc}T12:00:00Z`) : null,
      cor: texto(fd.get("cor"), 60),
      fotoUrl,
      outroGenitor: texto(fd.get("outroGenitor"), 120),
      tutorNome,
      mostrarTutor: !!tutorNome && fd.get("mostrarTutor") === "1",
      exibirPublico: fd.get("exibirPublico") !== "0",
    },
  });
  return NextResponse.json(criado, { status: 201 });
}
