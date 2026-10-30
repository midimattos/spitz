"use client";

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="text-center max-w-md">
        <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Algo deu errado</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
          Tivemos um problema ao carregar esta página. Tente novamente; se continuar, avise a equipe.
        </p>
        <button onClick={() => reset()} className="mt-6 px-5 py-2 rounded text-white" style={{ background: "var(--pine)" }}>
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
