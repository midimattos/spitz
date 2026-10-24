import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { calcularComissaoVenda } from "@/lib/precos-plataforma";
import { registrarVenda } from "@/lib/vendas";
import { processarMarcaDaVenda } from "@/lib/marca-venda";
import { urlBaseDaRequisicao } from "@/lib/url-base";
import { ipDaRequisicao } from "@/lib/integridade";
import { alertarNovoAnuncio } from "@/lib/avisos-anuncio";

const vendaSchema = z.object({
  precoFinal: z.number().positive("Informe o preço final da venda"),
  canal: z.enum(["PLATAFORMA_MATCH", "PLATAFORMA_CONTATO", "FORA"]),
  dataVenda: z.string().optional(),
  compradorNome: z.string().max(120).optional(),
  compradorTelefone: z.string().max(30).optional(),
  compradorEmail: z.string().email("E-mail do comprador inválido").optional().or(z.literal("")),
  origemComprador: z.enum(["MARKETPLACE", "INSTAGRAM", "WHATSAPP", "INDICACAO", "OUTRO"]).optional(),
  estadoComprador: z.string().length(2).optional().or(z.literal("")),
  cidadeComprador: z.string().max(80).optional(),
});

const anuncioUpdateSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional(),
  preco: z.number().positive().optional(),
  // "PREMIUM" só é setado pelo webhook de pagamento (ver
  // /api/pagamentos/anuncio-premium) — por aqui só dá para voltar a
  // GRATUITO, nunca virar PREMIUM sem pagar.
  tipo: z.enum(["GRATUITO"]).optional(),
  status: z.enum(["RASCUNHO", "PUBLICADO", "PAUSADO", "VENDIDO"]).optional(),
  // Obrigatório ao marcar como VENDIDO: é o dado que alimenta a precificação.
  venda: vendaSchema.optional(),
  // Opcional ao pausar: por que o criador tirou o anúncio do ar.
  motivo: z.enum(["DESISTI", "PRECO_ALTO", "OUTRO"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existente = await prisma.anuncio.findFirst({ where: { id, canilId: canil.id } });
  if (!existente) return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = anuncioUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { venda, motivo, ...camposSimples } = parsed.data;
  const passouAVendido = camposSimples.status === "VENDIDO" && existente.status !== "VENDIDO";

  if (passouAVendido && !venda) {
    return NextResponse.json(
      { error: "Para marcar como vendido, informe o preço final e como a venda foi fechada" },
      { status: 400 }
    );
  }

  const dados: Record<string, unknown> = { ...camposSimples };

  // ---- datas e motivos do ciclo de vida ----
  if (camposSimples.status === "PUBLICADO") {
    if (!existente.publicadoEm) dados.publicadoEm = new Date();
    dados.encerradoEm = null;
    dados.motivoEncerramento = null;
  }
  if (passouAVendido && venda) {
    dados.encerradoEm = new Date();
    dados.motivoEncerramento = venda.canal === "FORA" ? "VENDIDO_FORA" : "VENDIDO_PLATAFORMA";
  }
  if (camposSimples.status === "PAUSADO" && motivo) {
    dados.encerradoEm = new Date();
    dados.motivoEncerramento = motivo;
  }

  const mudouPreco =
    camposSimples.preco !== undefined && camposSimples.preco !== Number(existente.preco);

  const anuncio = await prisma.$transaction(async (tx) => {
    const atualizado = await tx.anuncio.update({ where: { id }, data: dados });

    if (mudouPreco) {
      await tx.historicoPreco.create({ data: { anuncioId: id, preco: atualizado.preco } });
    }

    if (passouAVendido && venda) {
      await registrarVenda(tx, {
        anuncioId: id,
        precoFinal: venda.precoFinal,
        canal: venda.canal,
        dataVenda: venda.dataVenda ? new Date(venda.dataVenda) : undefined,
        registroIp: ipDaRequisicao(request),
        comprador: {
          telefone: venda.compradorTelefone || null,
          nome: venda.compradorNome || null,
          email: venda.compradorEmail || null,
          origem: venda.origemComprador ?? null,
          estado: venda.estadoComprador ? venda.estadoComprador.toUpperCase() : null,
          cidade: venda.cidadeComprador || null,
        },
      });

      // A comissão da plataforma vale para qualquer venda marcada, seja qual
      // for o canal — assim não existe incentivo para declarar "vendi por
      // fora" só para fugir da cobrança (o que contaminaria os dados de mercado).
      const jaTemComissao = await tx.pagamento.findFirst({
        where: { anuncioId: id, tipo: "COMISSAO_VENDA" },
      });
      if (!jaTemComissao && calcularComissaoVenda(venda.precoFinal) > 0) {
        await tx.pagamento.create({
          data: {
            canilId: canil.id,
            anuncioId: id,
            tipo: "COMISSAO_VENDA",
            valor: calcularComissaoVenda(venda.precoFinal),
          },
        });
      }
    }

    return atualizado;
  });

  if (camposSimples.status === "PUBLICADO" && !existente.publicadoEm) {
    await alertarNovoAnuncio(id, urlBaseDaRequisicao(request));
  }

  if (passouAVendido && venda) {
    await processarMarcaDaVenda(id, urlBaseDaRequisicao(request));
  }

  return NextResponse.json(anuncio);
}
