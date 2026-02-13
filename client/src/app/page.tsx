export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream">
      <h1 className="text-5xl font-bold font-heading text-dark">
        Afri<span className="text-primary">Stay</span>
      </h1>
      <p className="mt-4 text-xl text-dark/70 font-body">
        L&apos;Afrique a portee de clic
      </p>
      <div className="mt-8 flex gap-4">
        <span className="inline-block h-3 w-3 rounded-full bg-primary" />
        <span className="inline-block h-3 w-3 rounded-full bg-secondary" />
        <span className="inline-block h-3 w-3 rounded-full bg-accent" />
      </div>
    </main>
  );
}
