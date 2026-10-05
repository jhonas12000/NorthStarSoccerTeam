import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Donation from './components/Donation';
import Teams from './components/Teams';
import Leadership from './components/Leadership';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

function ScrollToHash() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [hash, pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToHash />
      <Navbar />

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <About />
                <Leadership />
                <Donation />
              </>
            }
          />
          <Route path="/teams" element={<Teams />} />
          <Route
            path="*"
            element={
              <section className="px-4 py-24 text-center">
                <h1 className="text-3xl font-extrabold text-blue-950">Page not found</h1>
                <a className="mt-6 inline-block font-bold text-blue-700 underline" href="/">
                  Return home
                </a>
              </section>
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;