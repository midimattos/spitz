import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/financeiro";
import { LABEL_SEXO } from "@/lib/labels";
import { CORES_MERCADO, corDoCao } from "@/lib/cores";
import { calcularReputacaoEmLote } from "@/lib/reputacao";
import { RastreadorEvento } from "@/components/rastreador-evento";
import type { Prisma } from "@prisma/client";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ porte?: string; sexo?: string; precoMax?: string; cor?: string; estado?: string }>;
}) {
  const { porte, sexo, precoMax, cor, estado } = await searchParams;

  // Valores vindos da URL são validados antes de qualquer uso.
  const precoMaxNumero = precoMax ? parseFloat(precoMax.replace(",", ".")) : NaN;
  const corValida = CORES_MERCADO.find((c) => c === cor);
  const estadoValido = estado && /^[a-zA-Z]{2}$/.test(estado) ? estado.toUpperCase() : undefined;
  const sexoValido = sexo === "MACHO" || sexo === "FEMEA" ? sexo : undefined;

  const where: Prisma.AnuncioWhereInput = {
    status: "PUBLICADO",
    canil: { verificado: true, ...(estadoValido ? { estado: estadoValido } : {}) },
    ...(Number.isFinite(precoMaxNumero) && precoMaxNumero > 0 ? { preco: { lte: precoMaxNumero } } : {}),
    cao: {
      ...(porte ? { porte } : {}),
      ...(sexoValido ? { sexo: sexoValido } : {}),
    },
  };

  const encontrados = await prisma.anuncio.findMany({
    where,
    include: { cao: true, canil: true },
    orderBy: [{ tipo: "desc" }, { criadoEm: "desc" }],
  });

  // A cor é normalizada (o cadastro aceita texto livre), então o filtro é feito aqui.
  const filtrados = corValida ? encontrados.filter((a) => corDoCao(a.cao) === corValida) : encontrados;

  // Dentro de cada grupo (Premium / Gratuito), canis com melhor reputação aparecem primeiro.
  const reputacoes = await calcularReputacaoEmLote([...new Set(filtrados.map((a) => a.canilId))]);
  const anuncios = [...filtrados].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "PREMIUM" ? -1 : 1;
    const diff = (reputacoes.get(b.canilId)?.score ?? 0) - (reputacoes.get(a.canilId)?.score ?? 0);
    return diff !== 0 ? diff : b.criadoEm.getTime() - a.criadoEm.getTime();
  });

  // Dados de busca para o radar de demanda: só quando há ao menos um filtro.
  const filtrosParaRegistro = {
    ...(porte ? { porte } : {}),
    ...(sexoValido ? { sexo: sexoValido } : {}),
    ...(Number.isFinite(precoMaxNumero) && precoMaxNumero > 0 ? { precoMax: precoMaxNumero } : {}),
    ...(corValida ? { cor: corValida } : {}),
    ...(estadoValido ? { estado: estadoValido } : {}),
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-16">
      {Object.keys(filtrosParaRegistro).length > 0 && <RastreadorEvento tipo="BUSCA" filtros={filtrosParaRegistro} />}
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Marketplace
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Filhotes de canis verificados.
      </p>

      <form method="GET" className="card mt-8 p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Porte
          </label>
          <select
            name="porte"
            defaultValue={porte ?? ""}
            className="px-3 py-2 rounded border bg-transparent text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <option value="">Qualquer</option>
            <option value="Anão">Anão</option>
            <option value="Pequeno">Pequeno</option>
            <option value="Médio">Médio</option>
          </select>
        </div>
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Sexo
          </label>
          <select
            name="sexo"
            defaultValue={sexo ?? ""}
            className="px-3 py-2 rounded border bg-transparent text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <option value="">Qualquer</option>
            <option value="MACHO">Macho</option>
            <option value="FEMEA">Fêmea</option>
          </select>
        </div>
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Cor
          </label>
          <select
            name="cor"
            defaultValue={corValida ?? ""}
            className="px-3 py-2 rounded border bg-transparent text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <option value="">Qualquer</option>
            {CORES_MERCADO.filter((c) => c !== "Outras").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Estado (UF)
          </label>
          <input
            name="estado"
            maxLength={2}
            defaultValue={estadoValido ?? ""}
            placeholder="RS"
            className="px-3 py-2 rounded border bg-transparent text-sm w-20 uppercase"
            style={{ borderColor: "var(--border-hairline)" }}
          />
        </div>
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Preço até (R$)
          </label>
          <input
            name="precoMax"
            defaultValue={precoMax ?? ""}
            inputMode="decimal"
            className="px-3 py-2 rounded border bg-transparent text-sm w-32"
            style={{ borderColor: "var(--border-hairline)" }}
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2 rounded text-white text-sm"
          style={{ background: "var(--pine)" }}
        >
          Filtrar
        </button>
      </form>

      {anuncios.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>Nenhum anúncio encontrado com esses filtros.</p>
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {anuncios.map((a) => (
            <Link
              key={a.id}
              href={`/marketplace/${a.id}`}
              className="card overflow-hidden hover:opacity-90 flex flex-col"
            >
              <div
                className="aspect-square flex items-center justify-center"
                style={{ background: "var(--parchment)" }}
              >
                {a.fotos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.fotos[0]} alt={a.titulo} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Sem foto
                  </span>
                )}
              </div>
              <div className="p-4">
                {a.tipo === "PREMIUM" && (
                  <span className="text-xs" style={{ color: "var(--brass)" }}>
                    ★ Destaque
                  </span>
                )}
                <h3 className="font-display text-lg mt-1" style={{ color: "var(--pine)" }}>
                  {a.titulo}
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
                  {a.canil.nome} · {LABEL_SEXO[a.cao.sexo]}
                  {a.cao.porte ? ` · ${a.cao.porte}` : ""}
                  {corDoCao(a.cao) ? ` · ${corDoCao(a.cao)}` : ""}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                  {reputacoes.get(a.canilId)?.resumo}
                </p>
                <p className="font-display text-lg mt-2" style={{ color: "var(--pine)" }}>
                  {formatarMoeda(Number(a.preco))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
