"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { MARKETPLACE_ATIVO } from "@/lib/marketplace-config";

export function RegisterForm({ cadastroAberto }: { cadastroAberto: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"CRIADOR" | "COMPRADOR">("CRIADOR");
  const tipo = searchParams.get("tipo");
  useEffect(() => {
    if (tipo === "comprador" && MARKETPLACE_ATIVO) setRole("COMPRADOR");
    else if (tipo === "criador") setRole("CRIADOR");
  }, [tipo]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      nomeCanil: role === "CRIADOR" ? formData.get("nomeCanil") || undefined : undefined,
      email: formData.get("email"),
      password: formData.get("password"),
      role,
      codigoConvite: formData.get("codigoConvite") || undefined,
      site: formData.get("site") || undefined,
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível concluir o cadastro");
      setCarregando(false);
      return;
    }

    // Após criar a conta, autentica automaticamente e leva ao dashboard certo.
    await signIn("credentials", {
      email: String(payload.email ?? "").trim().toLowerCase(),
      password: payload.password,
      redirect: false,
    });

    router.push(role === "CRIADOR" ? "/dashboard/criador" : "/dashboard/comprador");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="font-display text-2xl" style={{ color: "var(--pine)" }}>
          Criar conta
        </h1>

        {MARKETPLACE_ATIVO && (
        <div className="mt-6 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setRole("CRIADOR")}
            className="flex-1 py-2 rounded border"
            style={{
              borderColor: role === "CRIADOR" ? "var(--pine)" : "var(--border-hairline)",
              background: role === "CRIADOR" ? "var(--pine)" : "transparent",
              color: role === "CRIADOR" ? "white" : "var(--ink)",
            }}
          >
            Sou criador
          </button>
          <button
            type="button"
            onClick={() => setRole("COMPRADOR")}
            className="flex-1 py-2 rounded border"
            style={{
              borderColor: role === "COMPRADOR" ? "var(--pine)" : "var(--border-hairline)",
              background: role === "COMPRADOR" ? "var(--pine)" : "transparent",
              color: role === "COMPRADOR" ? "white" : "var(--ink)",
            }}
          >
            Quero um filhote
          </button>
        </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}>
            <label>Não preencha este campo<input name="site" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              {role === "CRIADOR" ? "Seu nome completo" : "Nome completo"}
            </label>
            <input
              name="name"
              required
              className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
              style={{ borderColor: "var(--border-hairline)" }}
            />
          </div>
          {role === "CRIADOR" && (
            <div>
              <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
                Nome do canil
              </label>
              <input
                name="nomeCanil"
                required
                minLength={2}
                maxLength={120}
                placeholder="Ex.: Canil Estrela do Sul"
                className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
                style={{ borderColor: "var(--border-hairline)" }}
              />
              <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                É o nome que aparece na sua página pública e nos documentos. Você pode mudar depois.
              </p>
            </div>
          )}
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              E-mail
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
              style={{ borderColor: "var(--border-hairline)" }}
            />
          </div>
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Senha
            </label>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
              style={{ borderColor: "var(--border-hairline)" }}
            />
          </div>

          {role === "CRIADOR" && (
            <div>
              <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {cadastroAberto ? "Código de convite (opcional)" : "Código de convite"}
              </label>
              <input
                name="codigoConvite"
                required={!cadastroAberto}
                defaultValue={searchParams.get("convite") ?? ""}
                className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
                style={{ borderColor: "var(--border-hairline)" }}
              />
              <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                {cadastroAberto
                  ? "Com um convite válido, seu canil já entra verificado. Sem convite, tudo bem: ele entra na fila de aprovação."
                  : "Por enquanto o cadastro é só por convite. Peça o código a um canil parceiro."}
                {" "}Todo canil novo ganha 30 dias grátis com todas as funções.
              </p>
            </div>
          )}

          <label className="flex items-start gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
            <input type="checkbox" name="aceite" required className="mt-0.5" />
            <span>
              Li e concordo com os{" "}
              <Link href="/termos" target="_blank" className="underline">
                Termos de uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="underline">
                Política de privacidade
              </Link>
              .
            </span>
          </label>

          {erro && (
            <p className="text-sm" style={{ color: "#a32d2d" }}>
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2 rounded text-white disabled:opacity-60"
            style={{ background: "var(--pine)" }}
          >
            {carregando ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center" style={{ color: "var(--ink-muted)" }}>
          Já tem conta?{" "}
          <Link href="/login" className="underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}

