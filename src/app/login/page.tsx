"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const formData = new FormData(e.currentTarget);

    const res = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setCarregando(false);

    if (res?.error) {
      setErro("E-mail ou senha incorretos");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="font-display text-2xl" style={{ color: "var(--pine)" }}>
          Entrar
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              required
              className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
              style={{ borderColor: "var(--border-hairline)" }}
            />
          </div>

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
            {carregando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center" style={{ color: "var(--ink-muted)" }}>
          Ainda não tem conta?{" "}
          <Link href="/register" className="underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
