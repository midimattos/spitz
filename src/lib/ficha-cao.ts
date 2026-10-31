// Ficha completa de um cão no cadastro com árvore (usada no navegador e no servidor).

export const LOCI_DNA = ["B", "E", "K", "A", "D", "S", "M", "I"] as const;

export type FichaCao = {
  nome: string;
  registro: string;
  microchip: string;
  dataNascimento: string; // AAAA-MM-DD
  porte: string;
  corPelagem: string;
  observacoes: string;
  corBase: string;
  marcacaoCor: string;
  corTrufa: string;
  diluicaoCor: string;
  merleCor: string;
  intensidadeCor: string;
  coresJaProduzidas: string[];
  temExameCorDNA: boolean;
  dnaLocusB: string;
  dnaLocusE: string;
  dnaLocusK: string;
  dnaLocusA: string;
  dnaLocusD: string;
  dnaLocusS: string;
  dnaLocusM: string;
  dnaLocusI: string;
  /** true = cão de outro canil (só aparece na árvore) */
  externo: boolean;
  canilOrigem: string;
  papel: "MATRIZ" | "PADREADOR" | "FILHOTE" | "APOSENTADO";
};

export type SlotArvore =
  | { modo: "nenhum" }
  | { modo: "existente"; id: string }
  | { modo: "novo"; ficha: FichaCao };

export function fichaVazia(parcial: Partial<FichaCao> = {}): FichaCao {
  return {
    nome: "",
    registro: "",
    microchip: "",
    dataNascimento: "",
    porte: "",
    corPelagem: "",
    observacoes: "",
    corBase: "",
    marcacaoCor: "",
    corTrufa: "",
    diluicaoCor: "",
    merleCor: "",
    intensidadeCor: "",
    coresJaProduzidas: [],
    temExameCorDNA: false,
    dnaLocusB: "",
    dnaLocusE: "",
    dnaLocusK: "",
    dnaLocusA: "",
    dnaLocusD: "",
    dnaLocusS: "",
    dnaLocusM: "",
    dnaLocusI: "",
    externo: false,
    canilOrigem: "",
    papel: "FILHOTE",
    ...parcial,
  };
}

/** Padrão de cada posição: cães ancestrais começam como "de outro canil". */
export function fichaAncestral(sexo: "MACHO" | "FEMEA"): FichaCao {
  return fichaVazia({ externo: true, papel: sexo === "MACHO" ? "PADREADOR" : "MATRIZ" });
}

export type CaminhoAvo = "pp" | "pm" | "mp" | "mm";

export const ROTULO_AVO: Record<CaminhoAvo, string> = {
  pp: "Avô paterno (pai do pai)",
  pm: "Avó paterna (mãe do pai)",
  mp: "Avô materno (pai da mãe)",
  mm: "Avó materna (mãe da mãe)",
};
