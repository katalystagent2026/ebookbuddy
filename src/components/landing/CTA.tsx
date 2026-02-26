import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Heart, ArrowRight } from 'lucide-react';
import { StudentRegistrationDialog } from './StudentRegistrationDialog';
import { useI18n } from '@/lib/i18n';

export function CTA() {
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
    <StudentRegistrationDialog open={registrationOpen} onOpenChange={setRegistrationOpen} />
    <section id="for-schools" className="py-20 md:py-28 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
      <div className="safe-container">
        <div className="relative">
          <div className="absolute top-0 left-10 w-20 h-20 rounded-full bg-accent/20 blur-2xl" />
          <div className="absolute bottom-0 right-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative bg-card rounded-3xl p-8 md:p-12 lg:p-16 shadow-medium border border-border overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-4 left-4 text-6xl">📚</div>
              <div className="absolute top-1/3 right-8 text-5xl">⭐</div>
              <div className="absolute bottom-8 left-1/4 text-4xl">✨</div>
              <div className="absolute bottom-4 right-1/3 text-5xl">📖</div>
            </div>

            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-6">
                  {t.ctaTitle1}{' '}
                  <span className="text-gradient-magic">{t.ctaTitle2}</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  {t.ctaSubtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button variant="hero" size="lg" className="group gentle-pulse" onClick={() => setRegistrationOpen(true)}>
                    <BookOpen className="w-5 h-5" />
                    {t.startReading}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button variant="forest" size="lg">
                    <Heart className="w-5 h-5" />
                    {t.becomeVolunteer}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-2xl p-6 text-center">
                  <div className="text-4xl font-heading font-bold text-primary mb-2">5,000+</div>
                  <p className="text-sm text-muted-foreground">{t.storiesShared}</p>
                </div>
                <div className="bg-muted rounded-2xl p-6 text-center">
                  <div className="text-4xl font-heading font-bold text-secondary mb-2">10+</div>
                  <p className="text-sm text-muted-foreground">{t.partnerSchools}</p>
                </div>
                <div className="bg-muted rounded-2xl p-6 text-center">
                  <div className="text-4xl font-heading font-bold text-accent-foreground mb-2">98%</div>
                  <p className="text-sm text-muted-foreground">{t.happyReaders}</p>
                </div>
                <div className="bg-muted rounded-2xl p-6 text-center">
                  <div className="text-4xl font-heading font-bold text-foreground mb-2">∞</div>
                  <p className="text-sm text-muted-foreground">{t.adventuresAhead}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">{t.schoolInterest}</p>
          <Button variant="outline" size="lg">
            {t.partnerWithUs}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
    </>
  );
}
