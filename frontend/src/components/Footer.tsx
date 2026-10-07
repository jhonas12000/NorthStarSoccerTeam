export default function Footer() {
  return (
    <footer id="contact" className="bg-blue-950 px-2 py-10 text-white sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-amber-300">
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
            </svg>
            Visit Us
          </h2>
          <address className="mt-3 not-italic leading-7 text-blue-100">
            Address to be added
          </address>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-amber-300">
              <path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 3a14 14 0 0 1-9-9l3-2-1-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Call Us
          </h2>
          <p className="mt-3 leading-7 text-blue-100">Phone number to be added</p>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-amber-300">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Email Us
          </h2>
          <a
            href="mailto:nothstarprime100@gmail.com"
            className="mt-3 inline-block leading-7 text-blue-100 hover:text-white"
          >
            northstarprime100@gmail.com
          </a>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-amber-300">
              <path d="M24 12a12 12 0 1 0-13.875 11.86v-8.39H7.078V12h3.047V9.356c0-3.007 1.791-4.668 4.532-4.668 1.312 0 2.685.234 2.685.234v2.953h-1.512c-1.49 0-1.955.925-1.955 1.874V12h3.328l-.532 3.47h-2.796v8.39A12.002 12.002 0 0 0 24 12Z" />
            </svg>
            Follow Us
          </h2>
          <p className="mt-3 leading-7 text-blue-100">
            Facebook page link to be added
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-blue-800 pt-5 text-sm text-blue-200">
        © {new Date().getFullYear()} North Star Youth Development Foundation Inc.
      </div>
    </footer>
  );
}