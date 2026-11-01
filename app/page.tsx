import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">PinPilot</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50">Autonomous GMB command center</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          AI-powered Google Business Profile optimization, review monitoring, local SEO automation, and map-pack growth insights for modern service brands.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login" className="rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950">Open dashboard</Link>
          <Link href="/dashboard" className="rounded-full border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-sm font-medium text-zinc-100">Preview overview</Link>
        </div>
      </div>
    </main>
  );
}
