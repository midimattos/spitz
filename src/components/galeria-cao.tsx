"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararImagem, mensagemDeErro } from "@/lib/imagem-cliente";

type Foto = { id: string; url: string };

/** Galeria do cão: várias fotos (filhotes em várias fases). A principal aparece no cartão e na vitrine. */
export function GaleriaCao({ caoId, fotos, fotoPrincipal }: { caoId: string; fotos: Foto[]; fotoPrincipal: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (arquivos.length === 0) return;
    setErro(null);
    let falhas = 0;
    for (const [i, a] of arquivos.entries()) {
      setStatus(`Enviando ${i + 1} de ${arquivos.length}…`);
      const fd = new FormData();
      fd.append("arquivo", await prepararImagem(a));
      const res = await fetch(`/api/caes/${caoId}/fotos`, { method: "POST", body: fd }).catch(() => null);
      if (!res || !res.ok) {
        falhas++;
        if (res) setErro(await mensagemDeErro(res, "Não foi possível enviar uma das fotos"));
      }
    }
    setStatus(null);
    if (falhas && !erro) setErro(`${falhas} foto(s) não foram enviadas. Tente de novo.`);
    router.refresh();
  }

  async function chamar(url: string, metodo: "PUT" | "DELETE") {
    setErro(null);
    const res = await fetch(url, { method: metodo }).catch(() => null);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível concluir") : "Sem conexão. Tente novamente.");
    router.refresh();
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>Fotos</h3>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={!!status} className="px-3 py-1.5 rounded border text-sm" style={{ borderColor: "var(--border-hairline)" }}>
          {status ?? "+ Adicionar fotos"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={enviar} />
      </div>
      {erro && <p className="text-xs mt-2" style={{ color: "#a32d2d" }}>{erro}</p>}
      {fotos.length === 0 ? (
        <p className="text-sm mt-2" style={{ color: "var(--ink-muted)" }}>Nenhuma foto na galeria ainda. Pode escolher várias de uma vez e voltar depois para acrescentar mais, em outras fases.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {fotos.map((f) => (
            <div key={f.id} className="rounded overflow-hidden border" style={{ borderColor: "var(--border-hairline)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="Foto do cão" className="w-full aspect-square object-cover" />
              <div className="flex items-center justify-between px-2 py-1 text-xs">
                {fotoPrincipal === f.url ? (
                  <span style={{ color: "var(--brass)" }}>Principal</span>
                ) : (
                  <button type="button" onClick={() => chamar(`/api/caes/${caoId}/fotos/${f.id}`, "PUT")} className="underline">usar como principal</button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Apagar esta foto?")) chamar(`/api/caes/${caoId}/fotos/${f.id}`, "DELETE");
                  }}
                  className="underline"
                  style={{ color: "#a32d2d" }}
                >
                  apagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
