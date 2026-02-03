import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { BookWorlds } from '@/components/landing/BookWorlds';
import { Features } from '@/components/landing/Features';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
