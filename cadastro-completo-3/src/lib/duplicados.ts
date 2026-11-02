/**
 * Regra ÚNICA de duplicidade de cães. Usada por TODOS os cadastros
 * (formulário em abas, cadastro simples, edição, importação de pedigree)
 * e também no navegador, para avisar antes de salvar.
 *
 * Dois registros são o mesmo cão quando:
 *  1. têm o mesmo nº de registro (ignora maiúsculas, espaços, barras e pontos);
 *  2. ou têm o mesmo microchip;
 *  3. ou têm o mesmo nome e o mesmo sexo, desde que NÃO tenham registros
 *     diferentes (registros diferentes = cães diferentes de mesmo nome).
 */

export type CaoChave = {
  id: string;
  nome: string;
  sexo: "MACHO" | "FEMEA";
  registro?: string | null;
  microchip?: string | null;
};

export type Candidato = {
  nome: string;
  sexo: "MACHO" | "FEMEA";
  registro?: string | null;
  microchip?: string | null;
};

export type MotivoDuplicado = "registro" | "microchip" | "nome";

export function chaveNome(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function chaveRegistro(s: string | null | undefined): string {
  return (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function chaveChip(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

/** Procura na lista um cão que seja o mesmo que o candidato. */
export function acharDuplicado<T extends CaoChave>(
  lista: T[],
  c: Candidato,
  ignorarId?: string
): { cao: T; motivo: MotivoDuplicado } | null {
  const reg = chaveRegistro(c.registro);
  const chip = chaveChip(c.microchip);
  const nome = chaveNome(c.nome);
  const base = ignorarId ? lista.filter((x) => x.id !== ignorarId) : lista;

  if (reg) {
    const e = base.find((x) => chaveRegistro(x.registro) === reg);
    if (e) return { cao: e, motivo: "registro" };
  }
  if (chip.length >= 8) {
    const e = base.find((x) => chaveChip(x.microchip) === chip);
    if (e) return { cao: e, motivo: "microchip" };
  }
  if (nome) {
    const e = base.find((x) => {
      if (x.sexo !== c.sexo || chaveNome(x.nome) !== nome) return false;
      const rx = chaveRegistro(x.registro);
      if (reg && rx && reg !== rx) return false; // registros diferentes: cães diferentes
      return true;
    });
    if (e) return { cao: e, motivo: "nome" };
  }
  return null;
}

export function mensagemDuplicado(c: Candidato, d: { cao: CaoChave; motivo: MotivoDuplicado }): string {
  const por = d.motivo === "registro" ? `o registro ${c.registro}` : d.motivo === "microchip" ? `o microchip ${c.microchip}` : "o mesmo nome e sexo";
  return `${d.cao.nome} já está cadastrado com ${por}. Escolha esse cão na lista em vez de cadastrar de novo.`;
}

/** Grupos de cães que parecem ser o mesmo (para a tela "Possíveis duplicados"). */
export function agruparDuplicados<T extends CaoChave>(lista: T[]): { cães: T[]; motivo: MotivoDuplicado }[] {
  const pai = new Map<string, string>();
  const achar = (x: string): string => {
    while (pai.get(x) !== x) {
      pai.set(x, pai.get(pai.get(x)!)!);
      x = pai.get(x)!;
    }
    return x;
  };
  lista.forEach((c) => pai.set(c.id, c.id));
  const motivos = new Map<string, MotivoDuplicado>();
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    const d = acharDuplicado(lista.slice(i + 1), { nome: a.nome, sexo: a.sexo, registro: a.registro, microchip: a.microchip });
    // acharDuplicado acha só o primeiro; repete até esgotar
    let resto = lista.slice(i + 1);
    let achado = d;
    while (achado) {
      pai.set(achar(achado.cao.id), achar(a.id));
      motivos.set(a.id, achado.motivo);
      const id = achado.cao.id;
      resto = resto.filter((x) => x.id !== id);
      achado = acharDuplicado(resto, { nome: a.nome, sexo: a.sexo, registro: a.registro, microchip: a.microchip });
    }
  }
  const grupos = new Map<string, T[]>();
  for (const c of lista) {
    const r = achar(c.id);
    grupos.set(r, [...(grupos.get(r) ?? []), c]);
  }
  return [...grupos.entries()]
    .filter(([, g]) => g.length > 1)
    .map(([r, g]) => ({ cães: g, motivo: motivos.get(r) ?? "nome" }));
}
