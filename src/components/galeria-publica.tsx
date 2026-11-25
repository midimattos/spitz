"use client";

import { useCallback, useEffect, useState } from "react";

/** Visualizador em tela cheia, com setas e teclado. */
function Visualizador({ fotos, inicio, aoFechar, alt }: { fotos: string[]; inicio: number; aoFechar: () => void; alt: string }) {
  const [i, setI] = useState(inicio);
  const ir = useCallback((d: number) => setI((x) => (x + d + fotos.length) % fotos.length), [fotos.length]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
      if (e.key === "ArrowRight") ir(1);
      if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", tecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar, ir]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(10,20,16,0.92)" }} onClick={aoFechar} role="dialog" aria-modal="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={fotos[i]} alt={alt} className="max-w-[94vw] max-h-[88vh] object-contain rounded" onClick={(e) => e.stopPropagation()} />
      <button type="button" onClick={aoFechar} className="absolute top-4 right-5 text-white text-3xl leading-none" aria-label="Fechar">×</button>
      {fotos.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); ir(-1); }} className="absolute left-3 sm:left-6 text-white text-4xl px-2" aria-label="Foto anterior">‹</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); ir(1); }} className="absolute right-3 sm:right-6 text-white text-4xl px-2" aria-label="Próxima foto">›</button>
          <p className="absolute bottom-4 text-xs text-white/80">{i + 1} / {fotos.length}</p>
        </>
      )}
    </div>
  );
}

/** Galeria do canil: colunas que respeitam a proporção de cada foto (nada é cortado nem esticado). */
export function GaleriaFotos({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [aberta, setAberta] = useState<number | null>(null);
  return (
    <>
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 [&>button]:mb-3">
        {fotos.map((url, i) => (
          <button key={url} type="button" onClick={() => setAberta(i)} className="block w-full overflow-hidden rounded cursor-zoom-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt} loading="lazy" className="w-full h-auto block hover:opacity-90 transition-opacity" />
          </button>
        ))}
      </div>
      {aberta !== null && <Visualizador fotos={fotos} inicio={aberta} aoFechar={() => setAberta(null)} alt={alt} />}
    </>
  );
}

/** Fotos de um filhote: quadro fixo 4:5 com a foto principal + miniaturas. Clique para ampliar. */
export function FotosFilhote({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [atual, setAtual] = useState(0);
  const [aberta, setAberta] = useState(false);

  if (fotos.length === 0) {
    return (
      <div className="aspect-[4/5] flex items-center justify-center text-xs rounded" style={{ background: "var(--parchment)", color: "var(--ink-muted)" }}>
        Fotos em breve
      </div>
    );
  }
  const miniaturas = fotos.slice(0, 5);
  return (
    <div>
      <button type="button" onClick={() => setAberta(true)} className="block w-full aspect-[4/5] overflow-hidden rounded cursor-zoom-in" style={{ background: "var(--parchment)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fotos[atual]} alt={alt} className="w-full h-full object-cover" />
      </button>
      {fotos.length > 1 && (
        <div className="mt-2 flex gap-1.5">
          {miniaturas.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setAtual(i)}
              className="relative flex-1 aspect-square overflow-hidden rounded border-2"
              style={{ borderColor: i === atual ? "var(--brass)" : "transparent" }}
              aria-label={`Ver foto ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              {i === miniaturas.length - 1 && fotos.length > miniaturas.length && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white" style={{ background: "rgba(18,36,29,0.55)" }}>+{fotos.length - miniaturas.length}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {aberta && <Visualizador fotos={fotos} inicio={atual} aoFechar={() => setAberta(false)} alt={alt} />}
    </div>
  );
}
