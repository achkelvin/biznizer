import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-12 sm:px-8">
      <section className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-[#e6ddd0] bg-[#fffdf9] shadow-[0_24px_70px_rgba(30,42,35,0.08)]">
        <div className="grid gap-10 px-6 py-8 sm:px-10 sm:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-14 lg:py-14">
          <div>
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.28em] text-[#c75c3b]">Biznizer / operations workspace</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-[-0.05em] text-[#1e2a23] sm:text-6xl">Run the counter. Keep the business moving.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#5d665f] sm:text-lg">
              A connected business platform for sales, stock, pricing, and the decisions that keep a fragrance business efficient and resilient.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="primary-btn px-6 py-4" href="/pos">Open point of sale</Link>
              <Link className="secondary-btn px-6 py-4" href="/pricing">Pricing planner</Link>
            </div>
          </div>

          <div className="surface-soft flex flex-col justify-between p-5 sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a8178]">Business snapshot</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-[#e7d7ca] bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a8178]">Today</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1e2a23]">24 orders</p>
                </div>
                <div className="rounded-2xl border border-[#e7d7ca] bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a8178]">Inventory</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1e2a23]">Healthy</p>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-[#f2e8df] p-4 text-sm text-[#3e4340]">
              Supabase + offline-first POS keeps the shop operating even when the signal drops.
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-[#eadfd2] bg-[#faf5f0] px-6 py-6 text-sm text-[#5d665f] sm:grid-cols-3 sm:px-10">
          <div><strong className="text-[#1e2a23]">Supabase</strong><br />One home for your data</div>
          <div><strong className="text-[#1e2a23]">Offline-ready</strong><br />Sales can wait for the signal</div>
          <div><strong className="text-[#1e2a23]">POS first</strong><br />Inventory follows the sale</div>
        </div>
      </section>
    </main>
  );
}
