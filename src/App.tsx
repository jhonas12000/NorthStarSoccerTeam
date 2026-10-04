import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Donation from './components/Donation';
import Teams from './components/Teams';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <About />
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