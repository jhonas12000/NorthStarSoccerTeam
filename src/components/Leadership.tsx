import { useState } from 'react';

const leadershipRoles = [
  {
    title: 'Chairman',
    photo: '/images/TegaySereke.jpg',
    description:
      'As Chairman, I am proud to help guide the vision and future of North Star Soccer Team. Our mission is to create a safe and supportive environment where young players can learn, compete, and grow. I work closely with our coaches, families, and community partners to strengthen the club and expand opportunities for our players. I believe every child deserves access to positive mentorship and quality soccer development. Together, we are building more than a soccer team—we are building confident young leaders and a stronger community.',
  },
  {
    title: 'Head Coach',
    photo: '/images/DanielCoach.jpg',
    description:
      'As Head Coach, my responsibility is to help every player improve both on and off the field. I focus on developing technical skills, physical fitness, discipline, teamwork, and confidence. Every player has different strengths, so I work to create an environment where each athlete feels challenged and supported. Winning is important, but effort, respect, sportsmanship, and personal growth are equally valuable. My goal is for our players to leave North Star as better athletes, dependable teammates, and responsible young people.',
  },
  {
    title: 'Finance Officer',
    photo: '/images/ErmiasChompe.JPG',
    description:
      'As Finance Officer, I am committed to managing the club’s resources carefully, responsibly, and transparently. I help prepare budgets that support training, equipment, uniforms, tournament participation, and other important team needs. Every donation and contribution should be used in a way that provides meaningful benefits to our players. I work with the club’s leadership to plan for current expenses while protecting the team’s long-term financial stability. My goal is to ensure that North Star can continue creating affordable and valuable opportunities for young athletes.',
  },
];

export default function Leadership() {
  const [expandedRoleTitles, setExpandedRoleTitles] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleRole = (title: string) => {
    setExpandedRoleTitles((currentTitles) => {
      const nextTitles = new Set(currentTitles);
      if (nextTitles.has(title)) {
        nextTitles.delete(title);
      } else {
        nextTitles.add(title);
      }
      return nextTitles;
    });
  };

  return (
    <section id="team" className="scroll-mt-24 bg-slate-50 px-2 py-12 sm:px-6 md:pt-12 md:pb-20">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600">
            Meet Our Team
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-blue-950 sm:text-4xl">
            Club leadership
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            The people helping guide and support North Star Soccer Team.
          </p>
        </header>

        <div className="mx-auto mt-8 grid max-w-7xl gap-4 md:mt-10 md:grid-cols-2 md:gap-5">
          {leadershipRoles.map(({ title, description, photo }) => {
            const isExpanded = expandedRoleTitles.has(title);
            const previewWords = description.split(/\s+/).slice(0, 32).join(' ');

            return (
              <article
                key={title}
                className="rounded-xl bg-white p-4 text-left shadow-sm sm:p-6 lg:p-7"
              >
                <h3 className="text-center text-xl font-bold text-blue-950">{title}</h3>
                <div className="mt-4 flex items-start gap-3 sm:gap-5 lg:gap-7">
                  <img
                    src={photo}
                    alt={`${title} profile`}
                    className="h-24 w-16 shrink-0 rounded-md object-cover sm:h-32 sm:w-24"
                  />
                  <p className="mt-1 text-sm leading-6 text-slate-600 sm:mt-2 sm:text-base sm:leading-7">
                    {isExpanded ? description : `${previewWords}…`}{' '}
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => toggleRole(title)}
                      className="font-bold text-blue-800 underline underline-offset-2 hover:text-blue-600"
                    >
                      {isExpanded ? 'Less' : 'More'}
                    </button>
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}