'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('LifeOS Global Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h1 className="text-lg font-bold">Something went wrong</h1>
        <p className="text-xs text-zinc-400">
          An unexpected error occurred while loading this view.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
