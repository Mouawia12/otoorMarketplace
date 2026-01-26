import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import EmailVerificationBanner from '../auth/EmailVerificationBanner';

export default function Layout() {
  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <Navbar />
      <EmailVerificationBanner />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 md:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
