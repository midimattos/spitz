"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararImagem, mensagemDeErro } from "@/lib/imagem-cliente";
import { normalizarSlug } from "@/lib/slug-canil";
import { CopiarTextoButton } from "@/components/copiar-texto-button";

const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const est = { borderColor: "var(--border-hairline)" };

type Cao = { id: string; nome: string; exibir: boolean };

export function PerfilCanilForm({
  canil,
  plantel,
  filhotes,
  ninhadas,
  temTelefone,
}: {
  canil: { nome: string; slug: string; descricao: string | null; instagram: string | null; fotos: string[] };
  plantel: Cao[];
  filhotes: Cao[];
  ninhadas: Cao[];
  temTelefone: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [slug, setSlug] = useState(canil.slug);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/canil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao: String(f.get("descricao") ?? ""), instagram: String(f.get("instagram") ?? ""), slug }),
    });
    setSalvando(false);
    if (!res.ok) {
      setMsg({ ok: false, texto: await mensagemDeErro(res, "Não foi possível salvar") });
      return;
    }
    setMsg({ ok: true, texto: "Perfil salvo." });
    router.refresh();
  }

  async function enviarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    if (arquivos.length === 0) return;
    setEnviando(true);
    setMsg(null);
    let falhas = 0;
    let ultimoErro = "";
    for (const arq of arquivos) {
      const fd = new FormData();
      fd.append("arquivo", await prepararImagem(arq));
      const res = await fetch("/api/canil/fotos", { method: "POST", body: fd }).catch(() => null);
      if (!res || !res.ok) {
        falhas++;
        ultimoErro = res ? await mensagemDeErro(res, "Não foi possível enviar a foto") : "Sem conexão.";
        if (res && res.status === 400) break;
      }
    }
    setEnviando(false);
    if (input.current) input.current.value = "";
    if (falhas > 0) setMsg({ ok: false, texto: `${falhas} foto(s) não enviada(s): ${ultimoErro}` });
    router.refresh();
  }

  async function removerFoto(url: string) {
    await fetch("/api/canil/fotos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    router.refresh();
  }

  async function alternar(caoId: string, exibir: boolean) {
    await fetch("/api/canil/plantel-publico", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caoId, exibir }) });
    router.refresh();
  }

  async function alternarNinhada(ninhadaId: string, exibir: boolean) {
    await fetch("/api/canil/ninhada-publica", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ninhadaId, exibir }) });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={salvar} className="card p-6 space-y-4">
        <div>
          <label className="text-sm">Endereço do seu canil</label>
          <div className="flex items-center gap-1 mt-1 text-sm">
            <span style={{ color: "var(--ink-muted)" }}>spitz-five.vercel.app/</span>
            <input value={slug} onChange={(e) => setSlug(normalizarSlug(e.target.value))} className="px-3 py-2 rounded border bg-transparent text-sm flex-1" style={est} />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <a href={`/${slug}`} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--brass)" }}>Ver minha página</a>
            <CopiarTextoButton texto={`/${slug}`} rotulo="Copiar link" className="underline" style={{ color: "var(--brass)" }} />
          </div>
        </div>
        <div>
          <label className="text-sm">Nossa história</label>
          <textarea name="descricao" defaultValue={canil.descricao ?? ""} rows={6} className={campo} style={est} placeholder="Conte como o canil começou, seus valores e o que torna seus Spitz especiais." />
        </div>
        <div>
          <label className="text-sm">Instagram</label>
          <input name="instagram" defaultValue={canil.instagram ?? ""} className={campo} style={est} placeholder="@seucanil" />
        </div>
        <div className="flex items-center gap-3">
          <button disabled={salvando} className="px-5 py-2 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
            {salvando ? "Salvando…" : "Salvar perfil"}
          </button>
          {msg && <span className="text-sm" style={{ color: msg.ok ? "var(--pine)" : "#a32d2d" }}>{msg.texto}</span>}
        </div>
      </form>

      <section className="card p-6">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Galeria do canil</h2>
        <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Aparecem na aba Galeria da sua página. A primeira foto também é a capa da Home. Até 60 fotos.</p>
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-[28rem] overflow-y-auto">
          {canil.fotos.map((u, i) => (
            <div key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="w-full aspect-square object-cover rounded" />
              {i === 0 && <span className="absolute top-1 left-1 text-[10px] px-1.5 rounded" style={{ background: "var(--parchment-card)" }}>Capa</span>}
              <button type="button" onClick={() => removerFoto(u)} className="absolute top-1 right-1 text-[11px] px-1.5 rounded" style={{ background: "var(--parchment-card)", color: "#a32d2d" }}>Remover</button>
            </div>
          ))}
        </div>
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={enviarFoto} />
        <button type="button" disabled={enviando || canil.fotos.length >= 60} onClick={() => input.current?.click()} className="mt-3 px-4 py-2 rounded border text-sm disabled:opacity-60" style={est}>
          {enviando ? "Enviando…" : "Adicionar fotos"}
        </button>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Plantel na página pública</h2>
        <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Matrizes e padreadores marcados aparecem na sua página.</p>
        {plantel.length === 0 ? (
          <p className="text-sm mt-3" style={{ color: "var(--ink-muted)" }}>Nenhuma matriz ou padreador cadastrado.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm" style={{ borderColor: "var(--border-hairline)" }}>
            {plantel.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <span>{c.nome}</span>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={c.exibir} onChange={(e) => alternar(c.id, e.target.checked)} /> Exibir
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Ninhadas na página pública</h2>
        <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Escolha quais ninhadas aparecem na aba Ninhadas (atuais, próximas e passadas). Os filhotes à venda são escolhidos na lista abaixo.</p>
        {ninhadas.length === 0 ? (
          <p className="text-sm mt-3" style={{ color: "var(--ink-muted)" }}>Nenhuma ninhada cadastrada.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm" style={{ borderColor: "var(--border-hairline)" }}>
            {ninhadas.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                <span>{c.nome}</span>
                <label className="flex items-center gap-2 text-xs shrink-0">
                  <input type="checkbox" checked={c.exibir} onChange={(e) => alternarNinhada(c.id, e.target.checked)} /> Exibir
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Filhotes na página pública</h2>
        <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
          Filhotes de ninhadas (ainda não vendidos) aparecem na aba Filhotes. Desmarque para esconder algum. As fotos vêm da ficha de cada filhote.
        </p>
        {filhotes.length === 0 ? (
          <p className="text-sm mt-3" style={{ color: "var(--ink-muted)" }}>Nenhum filhote disponível cadastrado.</p>
        ) : (
          <ul className="mt-3 divide-y text-sm" style={{ borderColor: "var(--border-hairline)" }}>
            {filhotes.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <span>{c.nome}</span>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={c.exibir} onChange={(e) => alternar(c.id, e.target.checked)} /> Exibir
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!temTelefone && (
        <p className="text-sm card p-4" style={{ color: "#a32d2d" }}>
          Falta o telefone/WhatsApp do canil: sem ele os botões &ldquo;Tenho interesse&rdquo; e &ldquo;Chamar no WhatsApp&rdquo; não aparecem. Preencha em <a href="/dashboard/criador/verificacao" className="underline">Dados do canil</a>.
        </p>
      )}
    </div>
  );
}
