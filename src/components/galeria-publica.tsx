"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/** Fotos de um filhote: pilha de fotos. Arraste para o lado (ou use as setas) para passar; clique para ampliar. */
export function FotosFilhote({ fotos, alt }: { fotos: string[]; alt: string }) {
  const n = fotos.length;
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [aberta, setAberta] = useState(false);
  const inicio = useRef<number | null>(null);
  const moveu = useRef(false);

  const passar = useCallback(
    (dir: 1 | -1) => {
      if (n < 2) return;
      setArrastando(false);
      setDx(-dir * 420);
      setTimeout(() => {
        setArrastando(true);
        setDx(0);
        setI((x) => (x + dir + n) % n);
        requestAnimationFrame(() => requestAnimationFrame(() => setArrastando(false)));
      }, 200);
    },
    [n]
  );

  if (n === 0) {
    return (
      <div className="aspect-[4/5] flex items-center justify-center text-xs rounded" style={{ background: "var(--parchment)", color: "var(--ink-muted)" }}>
        Fotos em breve
      </div>
    );
  }

  const foto = (k: number) => fotos[(i + k) % n];
  const atras = n > 2 ? [2, 1] : n > 1 ? [1] : [];

  return (
    <div>
      <div className="relative aspect-[4/5] mx-2 select-none">
        {atras.map((k) => (
          <div
            key={`${i}-${k}`}
            className="absolute inset-0 rounded overflow-hidden border"
            style={{ transform: `rotate(${k === 1 ? 3.5 : -3.5}deg) scale(0.97)`, borderColor: "var(--border-hairline)", background: "var(--parchment)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto(k)} alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
        ))}
        <div
          className="absolute inset-0 rounded overflow-hidden border shadow-md cursor-grab active:cursor-grabbing"
          style={{
            transform: `translateX(${dx}px) rotate(${dx / 25}deg)`,
            transition: arrastando ? "none" : "transform 0.2s ease-out",
            touchAction: "pan-y",
            borderColor: "var(--border-hairline)",
            background: "var(--parchment)",
          }}
          onPointerDown={(e) => {
            inicio.current = e.clientX;
            moveu.current = false;
            setArrastando(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (inicio.current === null) return;
            const d = e.clientX - inicio.current;
            if (Math.abs(d) > 6) moveu.current = true;
            setDx(d);
          }}
          onPointerUp={() => {
            if (inicio.current === null) return;
            inicio.current = null;
            if (Math.abs(dx) > 70 && n > 1) {
              passar(dx < 0 ? 1 : -1);
            } else {
              setArrastando(false);
              setDx(0);
              if (!moveu.current) setAberta(true);
            }
          }}
          onPointerCancel={() => {
            inicio.current = null;
            setArrastando(false);
            setDx(0);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotos[i]} alt={alt} className="w-full h-full object-cover pointer-events-none" draggable={false} />
          {n > 1 && <span className="absolute top-2 right-2 text-[11px] px-2 py-0.5 rounded-full text-white" style={{ background: "rgba(18,36,29,0.65)" }}>{i + 1}/{n}</span>}
        </div>
        {n > 1 && (
          <>
            <button type="button" onClick={() => passar(-1)} className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-white text-xl flex items-center justify-center" style={{ background: "rgba(18,36,29,0.6)" }} aria-label="Foto anterior">‹</button>
            <button type="button" onClick={() => passar(1)} className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-white text-xl flex items-center justify-center" style={{ background: "rgba(18,36,29,0.6)" }} aria-label="Próxima foto">›</button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {fotos.slice(0, 12).map((_, k) => (
            <span key={k} className="w-1.5 h-1.5 rounded-full" style={{ background: k === i % 12 ? "var(--brass)" : "var(--border-hairline)" }} />
          ))}
        </div>
      )}
      {aberta && <Visualizador fotos={fotos} inicio={i} aoFechar={() => setAberta(false)} alt={alt} />}
    </div>
  );
}
