import { useEffect, useState } from 'react';

const heroPhotos = [
  { src: '/images/hero-team.jpeg', alt: 'North Star Soccer Team players and coaches' },
  { src: '/images/north-star-title-celebration.jpeg', alt: 'North Star Soccer Team Title Celebration' },
  { src: '/images/north-star1.jpg', alt: 'North Star Soccer Team players and coaches' },
  
  // Add more { src, alt } entries here to include photos in the rotation.
];

export default function Hero() {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    if (
      heroPhotos.length < 2 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActivePhotoIndex((currentIndex) => (currentIndex + 1) % heroPhotos.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section id="home" className="bg-white">
      <div className="grid lg:grid-cols-2">
        {/* Team photo */}
        <div
          className="relative h-[38svh] min-h-72 lg:order-2 lg:h-auto"
          aria-label="Team photos"
          role="region"
        >
          {heroPhotos.map((photo, index) => (
            <img
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              aria-hidden={index !== activePhotoIndex}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 motion-reduce:transition-none ${index === activePhotoIndex ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}

          <a
            href="#support"
            className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-md bg-amber-400 px-4 py-2 text-sm font-bold text-blue-950 shadow-lg transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Support Us
          </a>

          {heroPhotos.length > 1 && (
            <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2">
              {heroPhotos.map((photo, index) => (
                <button
                  key={photo.src}
                  type="button"
                  aria-label={`Show photo ${index + 1} of ${heroPhotos.length}`}
                  aria-current={index === activePhotoIndex}
                  onClick={() => setActivePhotoIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full border border-white transition-colors ${index === activePhotoIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/75'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Hero content */}
        <div className="flex items-center px-4 pt-10 pb-4 sm:px-8 lg:order-1 lg:px-16 lg:py-8">
          <div className="mx-auto max-w-2xl text-center lg:text-left">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Community • Teamwork • Opportunity
            </p>

            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-blue-950 sm:text-3xl lg:text-5xl">
              Building players and strengthening our community
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              North Star Soccer Team helps young athletes develop confidence,
              discipline, leadership, and teamwork through soccer.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href="#team"
                className="flex min-h-12 items-center justify-center rounded-md bg-amber-400 px-6 py-3 font-bold text-blue-950 transition hover:bg-amber-300"
              >
                Meet Our Team
              </a>

              <a
                href="#about"
                className="flex min-h-12 items-center justify-center rounded-md border-2 border-blue-950 px-6 py-3 font-bold text-blue-950 transition hover:bg-blue-950 hover:text-white"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
