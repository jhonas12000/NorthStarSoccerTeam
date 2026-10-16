import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Donation from './components/Donation';
import Teams from './components/Teams';
import Leadership from './components/Leadership';
import Gallery from './components/Gallery';
import Footer from './components/Footer';
import Login from './components/Login';
import MemberDashboard from './components/MemberDashboard';
import AdminInvitationsPage from './components/AdminInvitationsPage';
import Members from './components/Members';
import AcceptInvitation from './components/AcceptInvitation';
import MemberDetails from './components/MemberDetails';
import AuthProvider from './AuthProvider';
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
      <AuthProvider>
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
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/login" element={<Login />} />
          <Route path="/member" element={<MemberDashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/:id" element={<MemberDetails />} />
          <Route path="/admin/invitations" element={<AdminInvitationsPage />} />
          <Route path="/accept-invite/:token" element={<AcceptInvitation />} />
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
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
