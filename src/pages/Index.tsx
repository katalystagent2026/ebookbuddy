import { useState, useEffect } from 'react';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { BookWorlds } from '@/components/landing/BookWorlds';
import { Features } from '@/components/landing/Features';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';
import { StudentRegistrationDialog } from '@/components/landing/StudentRegistrationDialog';

const Index = () => {
  const [autoPopupOpen, setAutoPopupOpen] = useState(false);

  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem('hasSeenStudentPopup');
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setAutoPopupOpen(true);
        sessionStorage.setItem('hasSeenStudentPopup', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <StudentRegistrationDialog open={autoPopupOpen} onOpenChange={setAutoPopupOpen} />
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <BookWorlds />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
