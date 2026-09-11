import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-5xl border border-[#d8d4ca] bg-[#fffdf8] p-8 shadow-[0_24px_70px_rgba(38,48,39,0.08)] sm:p-14">
        <div className="max-w-2xl">
          <p className="mb-6 text-sm font-bold uppercase tracking-[0.24em] text-[#c75c3b]">Biznizer / first workspace</p>
          <h1 className="text-5xl font-semibold leading-[0.98] tracking-tight text-[#1d2a24] sm:text-7xl">Run the counter. Keep the business moving.</h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[#5d665f]">A connected business platform for sales, stock, and the small decisions that keep a shop humming.</p>
          <Link className="mt-10 inline-flex items-center gap-3 bg-[#1d2a24] px-6 py-4 text-sm font-bold text-[#fffdf8] transition hover:bg-[#c75c3b]" href="/pos">
            Open point of sale <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
        <div className="mt-16 grid gap-4 border-t border-[#d8d4ca] pt-6 text-sm text-[#5d665f] sm:grid-cols-3">
          <span><strong className="text-[#1d2a24]">Supabase</strong><br />One home for your data</span>
          <span><strong className="text-[#1d2a24]">Offline-ready</strong><br />Sales can wait for the signal</span>
          <span><strong className="text-[#1d2a24]">POS first</strong><br />Inventory follows the sale</span>
        </div>
      </section>
    </main>
  );
}
