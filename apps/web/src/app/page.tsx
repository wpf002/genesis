export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Genesis</h1>
      <p className="text-neutral-400">
        Phase 0 — infrastructure only. No simulation, no map, no claims.
      </p>
      <p className="text-sm text-neutral-500">
        The map and the provenance inspector land in Phase 6. Until then there is
        nothing here that could be mistaken for a result.
      </p>
    </main>
  );
}
