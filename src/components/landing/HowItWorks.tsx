import { UserPlus, Users, BookOpen, Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const colorClasses = {
  primary: {
    icon: 'bg-gradient-sky text-primary-foreground shadow-glow-sky',
  },
  secondary: {
    icon: 'bg-gradient-forest text-secondary-foreground shadow-soft',
  },
  accent: {
    icon: 'bg-gradient-sunrise text-accent-foreground shadow-glow-golden',
  },
};

export function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    { icon: UserPlus, title: t.step1Title, description: t.step1Desc, color: 'primary' as const, emoji: '🔒' },
    { icon: Users, title: t.step2Title, description: t.step2Desc, color: 'secondary' as const, emoji: '🤝' },
    { icon: BookOpen, title: t.step3Title, description: t.step3Desc, color: 'accent' as const, emoji: '📖' },
    { icon: Star, title: t.step4Title, description: t.step4Desc, color: 'primary' as const, emoji: '⭐' },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-background">
      <div className="safe-container">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-secondary-light text-secondary-foreground text-sm font-medium mb-4">
            {t.howItWorksBadge}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-4">
            {t.howItWorksTitle}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t.howItWorksSubtitle}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-full" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, index) => {
              const colors = colorClasses[step.color];
              return (
                <div key={index} className="relative group" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-sm font-bold text-muted-foreground z-10">
                    {index + 1}
                  </div>
                  <div className="card-warm p-6 h-full text-center lg:text-left">
                    <div className={`w-16 h-16 rounded-2xl ${colors.icon} flex items-center justify-center mb-5 mx-auto lg:mx-0 group-hover:scale-110 transition-transform duration-200`}>
                      <step.icon className="w-7 h-7" />
                    </div>
                    <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
                      <h3 className="text-xl font-heading font-bold text-foreground">{step.title}</h3>
                      <span className="text-lg">{step.emoji}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* YouTube Video */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-xl font-heading font-bold text-foreground">{t.watchVideo} 🎬</h3>
          </div>
          <div className="relative w-full rounded-2xl overflow-hidden shadow-medium border border-border" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/VqtjQbF8EuY"
              title="How eBookBuddy Works"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Trust note */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-muted">
            <span className="text-xl">🛡️</span>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{t.safetyNote}</span> {t.safetyDesc}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
