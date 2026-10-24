import { contarVendasConfiaveisPorCanil } from "@/lib/integridade";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/financeiro";
import { LABEL_SEXO } from "@/lib/labels";
import { calcularSelos, fotosDoAnuncio } from "@/lib/marketplace";
import { Selos } from "@/components/selos";
import { corDoCao } from "@/lib/cores";
import { calcularReputacaoEmLote } from "@/lib/reputacao";
import { RastreadorEvento } from "@/components/rastreador-evento";
import {
  OPCOES_COR_BASE,
  OPCOES_MARCACAO,
  OPCOES_DILUICAO,
  OPCOES_MERLE,
} from "@/lib/genetica-cor";
import { lerFiltros, temFiltros, avaliarAnuncio, resumoCompatibilidade } from "@/lib/busca";

// Marketplace 100% público: qualquer pessoa navega e busca sem login. Só
// anúncios PUBLICADOS de canis verificados aparecem.

const campo = "px-3 py-2 rounded border bg-transparent text-sm";
const estiloCampo = { borderColor: "var(--border-hairline)" };
const rotulo = "text-xs block";

function Seletor({ nome, titulo, opcoes, valor }: { nome: string; titulo: string; opcoes: string[]; valor?: string }) {
  return (
    <div>
      <label className={rotulo} style={{ color: "var(--ink-muted)" }}>{titulo}</label>
      <select name={nome} defaultValue={valor ?? ""} className={campo} style={estiloCampo}>
        <option value="">Qualquer</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = lerFiltros(await searchParams);
  const buscando = temFiltros(filtros);

  const todos = await prisma.anuncio.findMany({
    where: { status: "PUBLICADO", canil: { verificado: true } },
    include: {
      canil: true,
      reservas: { where: { ativa: true }, select: { id: true } },
      cao: {
        include: {
          documentos: { select: { tipo: true } },
          laudosGeneticos: { select: { id: true } },
          cuidados: { select: { tipo: true, proximaData: true } },
        },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  const reputacoes = await calcularReputacaoEmLote([...new Set(todos.map((a) => a.canilId))]);

  // Só vendas confirmadas e sem sinal de manipulação; o benefício é limitado a 10 vendas.
  const vendasPorCanil = await contarVendasConfiaveisPorCanil();

  const avaliados = todos.map((a) => ({
    a,
    c: avaliarAnuncio(filtros, a.cao, a.canil, Number(a.preco)),
  }));

  // Ranking: mais critérios atendidos primeiro; empate → Premium, depois reputação, depois mais novo.
  const ordenar = (x: (typeof avaliados)[number], y: (typeof avaliados)[number]) => {
    const rx = x.c.total ? x.c.casados.length / x.c.total : 0;
    const ry = y.c.total ? y.c.casados.length / y.c.total : 0;
    if (ry !== rx) return ry - rx;
    if (y.c.casados.length !== x.c.casados.length) return y.c.casados.length - x.c.casados.length;
    if (x.a.canil.assinaturaPro !== y.a.canil.assinaturaPro) return x.a.canil.assinaturaPro ? -1 : 1;
    // Premia quem registra vendas na plataforma: mais vendas registradas, mais acima.
    const vx = Math.min(10, vendasPorCanil.get(x.a.canilId) ?? 0);
    const vy = Math.min(10, vendasPorCanil.get(y.a.canilId) ?? 0);
    if (vx !== vy) return vy - vx;
    const d = (reputacoes.get(y.a.canilId)?.score ?? 0) - (reputacoes.get(x.a.canilId)?.score ?? 0);
    return d !== 0 ? d : y.a.criadoEm.getTime() - x.a.criadoEm.getTime();
  };

  const combinam = buscando ? avaliados.filter((x) => x.c.casados.length > 0).sort(ordenar) : [...avaliados].sort(ordenar);
  const outros = buscando ? avaliados.filter((x) => x.c.casados.length === 0).sort(ordenar) : [];

  const card = ({ a, c }: (typeof avaliados)[number]) => {
    const cor = corDoCao(a.cao);
    const fotos = fotosDoAnuncio(a, a.cao);
    const selos = calcularSelos({
      canil: a.canil,
      cao: a.cao,
      documentos: a.cao.documentos,
      laudos: a.cao.laudosGeneticos.length,
      cuidados: a.cao.cuidados,
    });
    const selo = resumoCompatibilidade(c);
    const detalhes = [a.cao.corBase, a.cao.marcacaoCor, a.cao.diluicaoCor, a.cao.merleCor && a.cao.merleCor !== "Não Merle" ? a.cao.merleCor : null]
      .filter(Boolean)
      .join(" · ");
    return (
      <Link key={a.id} href={`/marketplace/${a.id}`} className="card overflow-hidden hover:opacity-90 flex flex-col">
        <div className="aspect-square flex items-center justify-center" style={{ background: "var(--parchment)" }}>
          {fotos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotos[0]} alt={a.titulo} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Sem foto</span>
          )}
        </div>
        <div className="p-4">
          {a.reservas.length > 0 && (
            <p className="text-xs inline-block px-2 py-0.5 rounded-full mb-1" style={{ background: "var(--brass)", color: "#fff" }}>Reservado</p>
          )}
          <Selos selos={selos} compacto />
          {selo && (
            <p className="text-xs" style={{ color: c.naoCasam.length === 0 ? "var(--pine)" : "var(--ink-muted)" }}>
              {selo}
            </p>
          )}
          <h3 className="font-display text-lg mt-1" style={{ color: "var(--pine)" }}>{a.titulo}</h3>
          <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
            {a.canil.nome} · {LABEL_SEXO[a.cao.sexo]}
            {a.cao.porte ? ` · ${a.cao.porte}` : ""}
          </p>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>{detalhes || cor || ""}</p>
          {(a.canil.cidade || a.canil.estado) && (
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              {[a.canil.cidade, a.canil.estado].filter(Boolean).join("/")}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{reputacoes.get(a.canilId)?.resumo}</p>
          <p className="font-display text-lg mt-2" style={{ color: "var(--pine)" }}>{formatarMoeda(Number(a.preco))}</p>
        </div>
      </Link>
    );
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-16">
      {buscando && <RastreadorEvento tipo="BUSCA" filtros={filtros} />}
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Marketplace</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Filhotes de canis verificados. Aberto a todos, sem precisar de cadastro.
      </p>

      <form method="GET" className="card mt-8 p-5">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Descreva o filhote que você procura. Nenhum campo é obrigatório, mas quanto mais você preencher, melhores
          serão os resultados.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 items-end">
          <Seletor nome="corBase" titulo="Cor base" opcoes={OPCOES_COR_BASE} valor={filtros.corBase} />
          <Seletor nome="marcacao" titulo="Marcação" opcoes={OPCOES_MARCACAO} valor={filtros.marcacao} />
          <Seletor nome="diluicao" titulo="Diluição" opcoes={OPCOES_DILUICAO} valor={filtros.diluicao} />
          <Seletor nome="merle" titulo="Merle" opcoes={OPCOES_MERLE} valor={filtros.merle} />
          <Seletor nome="porte" titulo="Porte" opcoes={["Anão", "Pequeno", "Médio"]} valor={filtros.porte} />
          <div>
            <label className={rotulo} style={{ color: "var(--ink-muted)" }}>Sexo</label>
            <select name="sexo" defaultValue={filtros.sexo ?? ""} className={campo} style={estiloCampo}>
              <option value="">Qualquer</option>
              <option value="MACHO">Macho</option>
              <option value="FEMEA">Fêmea</option>
            </select>
          </div>
          <div>
            <label className={rotulo} style={{ color: "var(--ink-muted)" }}>Valor de (R$)</label>
            <input name="precoMin" defaultValue={filtros.precoMin ?? ""} inputMode="decimal" className={`${campo} w-28`} style={estiloCampo} />
          </div>
          <div>
            <label className={rotulo} style={{ color: "var(--ink-muted)" }}>até (R$)</label>
            <input name="precoMax" defaultValue={filtros.precoMax ?? ""} inputMode="decimal" className={`${campo} w-28`} style={estiloCampo} />
          </div>
          <div>
            <label className={rotulo} style={{ color: "var(--ink-muted)" }}>Estado (UF)</label>
            <input name="estado" maxLength={2} defaultValue={filtros.estado ?? ""} placeholder="RS" className={`${campo} w-20 uppercase`} style={estiloCampo} />
          </div>
          <div>
            <label className={rotulo} style={{ color: "var(--ink-muted)" }}>Cidade</label>
            <input name="cidade" defaultValue={filtros.cidade ?? ""} className={`${campo} w-40`} style={estiloCampo} />
          </div>
          <button type="submit" className="px-5 py-2 rounded text-white text-sm" style={{ background: "var(--pine)" }}>
            Buscar
          </button>
          {buscando && (
            <Link href="/marketplace" className="text-sm underline" style={{ color: "var(--ink-muted)" }}>
              Limpar
            </Link>
          )}
        </div>
      </form>

      {todos.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>Ainda não há filhotes anunciados.</p>
        </div>
      ) : (
        <>
          {buscando && (
            <h2 className="font-display text-xl mt-8" style={{ color: "var(--pine)" }}>
              {combinam.length > 0 ? `${combinam.length} resultado${combinam.length > 1 ? "s" : ""} para a sua busca` : "Nenhum filhote combina com a busca"}
            </h2>
          )}
          {buscando && combinam.length === 0 && (
            <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
              Tente retirar alguns critérios. Sua busca foi registrada e ajuda os criadores a saber o que está em falta.
            </p>
          )}
          {combinam.length > 0 && <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{combinam.map(card)}</div>}
          {outros.length > 0 && (
            <>
              <h2 className="font-display text-xl mt-10" style={{ color: "var(--pine)" }}>Outros filhotes disponíveis</h2>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{outros.map(card)}</div>
            </>
          )}
        </>
      )}
    </main>
  );
}
