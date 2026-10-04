export default function About() {
  return (
    <section id="about" className="bg-white px-4 pt-8 pb-16 sm:px-6 md:pt-12 md:pb-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
            Who We Are
          </p>

          <h2 className="mt-3 text-3xl font-extrabold text-blue-950 sm:text-4xl">
            More than a soccer team
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            North Star Soccer Team is a nonprofit organization dedicated to
            helping young athletes grow through soccer, mentorship, and
            teamwork.
          </p>

          <p className="mt-4 leading-7 text-slate-600">
            We provide a positive and inclusive environment where players can
            improve their skills, build confidence, form friendships, and
            become leaders in their community.
          </p>

          <a
            href="#team"
            className="mt-8 inline-flex min-h-12 items-center rounded-md bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-800"
          >
            Learn About Our Team
          </a>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl bg-blue-950 p-6 text-white">
            <span className="text-3xl">⚽</span>
            <h3 className="mt-4 text-xl font-bold">Player Development</h3>
            <p className="mt-2 text-blue-100">
              Developing technical skills, discipline, and confidence.
            </p>
          </article>

          <article className="rounded-xl bg-amber-400 p-6 text-blue-950">
            <span className="text-3xl">🤝</span>
            <h3 className="mt-4 text-xl font-bold">Teamwork</h3>
            <p className="mt-2">
              Learning cooperation, respect, and responsibility.
            </p>
          </article>

          <article className="rounded-xl bg-slate-100 p-6 text-blue-950 sm:col-span-2">
            <span className="text-3xl">⭐</span>
            <h3 className="mt-4 text-xl font-bold">Community</h3>
            <p className="mt-2 text-slate-600">
              Creating opportunities and building lasting relationships through
              the game we love.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}