"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararImagem, mensagemDeErro } from "@/lib/imagem-cliente";
import { CopiarTextoButton } from "@/components/copiar-texto-button";

const est = { borderColor: "var(--border-hairline)" };

export function AlbumNinhada({ ninhadaId, fotos, token, canilNome }: { ninhadaId: string; fotos: { id: string; url: string }[]; token: string | null; canilNome: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    if (!arquivos.length) return;
    setEnviando(true);
    setErro(null);
    for (const a of arquivos) {
      const fd = new FormData();
      fd.append("arquivo", await prepararImagem(a));
      const res = await fetch(`/api/ninhadas/${ninhadaId}/album`, { method: "POST", body: fd }).catch(() => null);
      if (!res || !res.ok) {
        setErro(res ? await mensagemDeErro(res, "Não foi possível enviar") : "Sem conexão.");
        break;
      }
    }
    setEnviando(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  async function remover(fotoId: string) {
    await fetch(`/api/ninhadas/${ninhadaId}/album`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fotoId }) });
    router.refresh();
  }

  const link = token ? `/album/${token}` : null;
  const zap = link && typeof window !== "undefined"
    ? `https://wa.me/?text=${encodeURIComponent(`Fotos dos filhotes do canil ${canilNome}: ${window.location.origin}${link}`)}`
    : null;

  return (
    <div className="mt-5 pt-5 border-t" style={est}>
      <p className="text-sm font-medium" style={{ color: "var(--pine)" }}>Álbum e divulgação</p>
      <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
        Envie fotos dos filhotes e compartilhe o link com quem está na fila ou comprou. Gere também o cartaz para os Stories.
      </p>
      {fotos.length > 0 && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-8 gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="w-full aspect-square object-cover rounded" />
              <button type="button" onClick={() => remover(f.id)} className="absolute top-0.5 right-0.5 text-[10px] px-1 rounded" style={{ background: "var(--parchment-card)", color: "#a32d2d" }}>x</button>
            </div>
          ))}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={enviar} />
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" disabled={enviando} onClick={() => input.current?.click()} className="px-3 py-1.5 rounded border disabled:opacity-60" style={est}>
          {enviando ? "Enviando…" : "Adicionar fotos"}
        </button>
        {link && <CopiarTextoButton texto={link} rotulo="Copiar link do álbum" className="px-3 py-1.5 rounded border" style={est} />}
        {zap && <a href={zap} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded border" style={est}>Enviar por WhatsApp</a>}
        <a href={`/api/ninhadas/${ninhadaId}/cartaz`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded border" style={est}>Cartaz para Stories</a>
      </div>
      {erro && <p className="text-xs mt-2" style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
