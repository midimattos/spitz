"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"CRIADOR" | "COMPRADOR">("CRIADOR");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role,
      codigoConvite: formData.get("codigoConvite") || undefined,
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
      email: payload.email,
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Nome completo
            </label>
            <input
              name="name"
              required
              className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
              style={{ borderColor: "var(--border-hairline)" }}
            />
          </div>
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
                Código de convite (opcional)
              </label>
              <input
                name="codigoConvite"
                defaultValue={searchParams.get("convite") ?? ""}
                className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
                style={{ borderColor: "var(--border-hairline)" }}
              />
              <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                Com um convite válido, seu canil já entra verificado. Sem
                convite, tudo bem — ele entra na fila de aprovação.
              </p>
            </div>
          )}

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

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
