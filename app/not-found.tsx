import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-sky-600/20 text-sky-400 flex items-center justify-center mx-auto text-xl font-bold">
          404
        </div>
        <h1 className="text-xl font-bold">Page Not Found</h1>
        <p className="text-sm text-zinc-400">
          The requested page could not be located.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition"
        >
          Return to LifeOS
        </Link>
      </div>
    </div>
  );
}
