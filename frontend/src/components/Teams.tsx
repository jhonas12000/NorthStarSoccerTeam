const teams = [
  { division: 'U-6', ageGroup: 'Under 6' },
  { division: 'U-8', ageGroup: 'Under 8' },
  { division: 'U-10', ageGroup: 'Under 10' },
  { division: 'U-12', ageGroup: 'Under 12' },
  { division: 'U-14', ageGroup: 'Under 14' },
];

export default function Teams() {
  return (
    <section className="min-h-[60vh] bg-slate-50 px-2 py-12 sm:px-6 md:py-20">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600">
            North Star Soccer Team
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-blue-950 sm:text-5xl">
            Our Teams
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Explore our youth soccer teams by age group.
          </p>
        </header>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(({ division, ageGroup }) => (
            <article
              key={division}
              className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className="inline-flex h-12 min-w-12 items-center justify-center rounded-full bg-blue-950 px-3 text-lg font-extrabold text-amber-300">
                {division}
              </span>
              <h2 className="mt-5 text-2xl font-bold text-blue-950">{ageGroup}</h2>
              <p className="mt-2 leading-7 text-slate-600">
                North Star youth soccer program · {division}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-12 text-center text-slate-600">
          Have questions about a team?{' '}
          <a className="font-bold text-blue-800 underline" href="/#contact">
            Get in touch
          </a>
          .
        </p>
      </div>
    </section>
  );
}