import { Button } from '@/components/ui/button';
import { Sparkles, Heart, BookOpen } from 'lucide-react';
import heroIllustration from '@/assets/hero-illustration.jpg';
import { useI18n } from '@/lib/i18n';

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen pt-20 md:pt-24 overflow-hidden bg-gradient-warm">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-10 w-3 h-3 rounded-full bg-accent opacity-60 animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/3 right-20 w-4 h-4 rounded-full bg-primary opacity-40 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/4 w-2 h-2 rounded-full bg-secondary opacity-50 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-3 h-3 rounded-full bg-accent opacity-50 animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="safe-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[calc(100vh-6rem)]">
          {/* Content */}
          <div className="flex flex-col gap-8 text-center lg:text-left animate-fade-in-up">
            <div className="flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-light border border-accent/30">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
                <span className="text-sm font-medium text-accent-foreground">{t.heroBadge}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-foreground leading-tight">
                {t.heroTitle1}{' '}
                <span className="text-gradient-magic">{t.heroTitle2}</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t.heroSubtitle}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="hero" size="xl" className="group">
                <BookOpen className="w-5 h-5" />
                {t.imStudent}
                <span className="text-xs opacity-80 ml-1">✨</span>
              </Button>
              <Button variant="heroOutline" size="xl" className="group">
                <Heart className="w-5 h-5" />
                {t.imVolunteer}
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 justify-center lg:justify-start pt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary-light flex items-center justify-center">
                  <span className="text-sm">🏫</span>
                </div>
                <span className="text-sm text-muted-foreground">{t.schoolsCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                  <span className="text-sm">📚</span>
                </div>
                <span className="text-sm text-muted-foreground">{t.storiesRead}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center">
                  <span className="text-sm">⭐</span>
                </div>
                <span className="text-sm text-muted-foreground">{t.safeVetted}</span>
              </div>
            </div>
          </div>

          {/* Hero Illustration */}
          <div className="relative flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative w-full max-w-lg lg:max-w-xl">
              <div className="absolute inset-0 bg-gradient-magic opacity-20 blur-3xl rounded-full transform scale-90" />
              <div className="relative rounded-3xl overflow-hidden shadow-medium page-turn">
                <img src={heroIllustration} alt="Two children reading a magical glowing book together in a cozy library" className="w-full h-auto" />
              </div>
              <div className="absolute -bottom-4 -left-4 sm:left-4 bg-card rounded-2xl p-4 shadow-medium animate-float border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-sunrise flex items-center justify-center">
                    <span className="text-lg">📖</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.readingNow}</p>
                    <p className="text-xs text-muted-foreground">"The Magic Tree House"</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 sm:right-4 bg-card rounded-2xl p-4 shadow-medium animate-float border border-border" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    <span className="text-lg">⭐</span>
                    <span className="text-lg">⭐</span>
                    <span className="text-lg">⭐</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t.booksThisWeek}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 50C240 90 480 10 720 50C960 90 1200 10 1440 50V100H0V50Z" className="fill-background" />
        </svg>
      </div>
    </section>
  );
}
