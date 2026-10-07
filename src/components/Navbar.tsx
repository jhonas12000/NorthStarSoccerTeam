import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <nav className="mx-auto max-w-7xl px-2 sm:px-6">
        <div className="flex h-18 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/images/north-star-logo.JPG"
              alt="North Star Soccer Team logo"
              className="h-11 w-11 rounded-full object-cover"
            />

            <div>
              <p className="font-bold leading-tight text-blue-950">
                North Star
              </p>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-slate-500">
                Youth Development Foundation Inc
              </p>
            </div>
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-md text-2xl text-blue-950 hover:bg-slate-100 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-7 md:flex">
            <Link className="font-semibold text-blue-950 hover:text-blue-600" to="/#home">
              Home
            </Link>
            <Link className="font-semibold text-blue-950 hover:text-blue-600" to="/#about">
              About
            </Link>
            <Link className="font-semibold text-blue-950 hover:text-blue-600" to="/teams">
              Teams
            </Link>
            <Link className="font-semibold text-blue-950 hover:text-blue-600" to="/gallery">
              Gallery
            </Link>
            <Link className="font-semibold text-blue-950 hover:text-blue-600" to="/#events">
              Events
            </Link>
            <Link className="font-semibold text-blue-950 hover:text-blue-600" to="/#contact">
              Contact
            </Link>
            <Link className="font-semibold text-blue-950 hover:text-blue-600" to="/login">
              Login
            </Link>

            <Link
              className="rounded-md bg-amber-400 px-5 py-2.5 font-bold text-blue-950 hover:bg-amber-300"
              to="/#support"
            >
              Support Us
            </Link>
          </div>
        </div>

        {/* Mobile navigation */}
        {menuOpen && (
          <div className="border-t border-slate-200 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              <Link
                className="rounded-md px-3 py-3 font-semibold text-blue-950 hover:bg-slate-100"
                to="/#home"
                onClick={closeMenu}
              >
                Home
              </Link>

              <Link
                className="rounded-md px-3 py-3 font-semibold text-blue-950 hover:bg-slate-100"
                to="/#about"
                onClick={closeMenu}
              >
                About
              </Link>

              <Link
                className="rounded-md px-3 py-3 font-semibold text-blue-950 hover:bg-slate-100"
                to="/teams"
                onClick={closeMenu}
              >
                Teams
              </Link>

              <Link
                className="rounded-md px-3 py-3 font-semibold text-blue-950 hover:bg-slate-100"
                to="/gallery"
                onClick={closeMenu}
              >
                Gallery
              </Link>

              <Link
                className="rounded-md px-3 py-3 font-semibold text-blue-950 hover:bg-slate-100"
                to="/#events"
                onClick={closeMenu}
              >
                Events
              </Link>

              <Link
                className="rounded-md px-3 py-3 font-semibold text-blue-950 hover:bg-slate-100"
                to="/#contact"
                onClick={closeMenu}
              >
                Contact
              </Link>

              <Link
                className="rounded-md px-3 py-3 font-semibold text-blue-950 hover:bg-slate-100"
                to="/login"
                onClick={closeMenu}
              >
                Login
              </Link>

              <Link
                className="mt-2 rounded-md bg-amber-400 px-3 py-3 text-center font-bold text-blue-950"
                to="/#support"
                onClick={closeMenu}
              >
                Support Us
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}