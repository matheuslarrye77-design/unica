import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-mute">O conteúdo não existe ou você não tem acesso.</p>
        <Link href="/inicio" className="mt-4 inline-flex font-medium text-unica">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
