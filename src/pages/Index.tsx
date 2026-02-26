import { useState, useEffect } from 'react';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { BookWorlds } from '@/components/landing/BookWorlds';
import { Features } from '@/components/landing/Features';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';
import { StudentRegistrationDialog } from '@/components/landing/StudentRegistrationDialog';
import { I18nProvider } from '@/lib/i18n';

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
    <I18nProvider>
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
    </I18nProvider>
  );
};

export default Index;
