"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-line bg-white px-6 py-10 text-center">
      <h1 className="text-xl font-semibold">Não foi possível carregar esta página</h1>
      <p className="mt-2 text-sm text-mute">Tente novamente. Se continuar, volte ao início.</p>
      <button type="button" onClick={reset} className="mt-4 min-h-11 rounded-lg bg-unica px-4 text-sm font-semibold text-white">
        Tentar de novo
      </button>
    </div>
  );
}
