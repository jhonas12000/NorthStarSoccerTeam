const galleryPhotos = [
  {
    src: '/images/hero-team.jpeg',
    alt: 'North Star Soccer Team players and coaches',
  },
  {
    src: '/images/north-star-title-celebration.jpeg',
    alt: 'North Star Soccer Team celebrating a title',
  },
  {
    src: '/images/north-star1.jpg',
    alt: 'North Star Soccer Team players',
  },
];

export default function Gallery() {
  return (
    <section className="min-h-[60vh] bg-slate-50 px-2 py-12 sm:px-6 md:py-20">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600">
            North Star Soccer Team
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-blue-950 sm:text-5xl">
            Gallery
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Moments from our team, players, and community.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryPhotos.map((photo) => (
            <figure
              key={photo.src}
              className="overflow-hidden rounded-xl bg-white shadow-sm"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className="aspect-4/3 w-full object-cover transition duration-300 hover:scale-105"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}