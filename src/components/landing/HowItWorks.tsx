import { UserPlus, Users, BookOpen, Star } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    title: 'Sign Up Safely',
    description: 'Students join with guardian approval. Volunteers go through a friendly verification process.',
    color: 'primary' as const,
    emoji: '🔒',
  },
  {
    icon: Users,
    title: 'Meet Your Reading Buddy',
    description: "Get matched with a caring reading partner based on schedule and interests. It's like finding a book friend!",
    color: 'secondary' as const,
    emoji: '🤝',
  },
  {
    icon: BookOpen,
    title: 'Read Together',
    description: 'Enter your cozy reading room with shared books, page turns, and helpful prompts along the way.',
    color: 'accent' as const,
    emoji: '📖',
  },
  {
    icon: Star,
    title: 'Celebrate Growth',
    description: 'Earn stars and badges as you read more stories. Every page helps you grow!',
    color: 'primary' as const,
    emoji: '⭐',
  },
];

const colorClasses = {
  primary: {
    bg: 'bg-primary-light',
    icon: 'bg-gradient-sky text-primary-foreground shadow-glow-sky',
    line: 'bg-primary/30',
  },
  secondary: {
    bg: 'bg-secondary-light',
    icon: 'bg-gradient-forest text-secondary-foreground shadow-soft',
    line: 'bg-secondary/30',
  },
  accent: {
    bg: 'bg-accent-light',
    icon: 'bg-gradient-sunrise text-accent-foreground shadow-glow-golden',
    line: 'bg-accent/30',
  },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-background">
      <div className="safe-container">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-secondary-light text-secondary-foreground text-sm font-medium mb-4">
            Simple & Safe
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-4">
            How eBookBuddy Works
          </h2>
          <p className="text-lg text-muted-foreground">
            A safe, structured journey from sign-up to story time—designed for trust and delight.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line (desktop) */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-full" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, index) => {
              const colors = colorClasses[step.color];
              return (
                <div
                  key={step.title}
                  className="relative group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Step number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-sm font-bold text-muted-foreground z-10">
                    {index + 1}
                  </div>

                  <div className="card-warm p-6 h-full text-center lg:text-left">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl ${colors.icon} flex items-center justify-center mb-5 mx-auto lg:mx-0 group-hover:scale-110 transition-transform duration-200`}>
                      <step.icon className="w-7 h-7" />
                    </div>

                    {/* Content */}
                    <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
                      <h3 className="text-xl font-heading font-bold text-foreground">
                        {step.title}
                      </h3>
                      <span className="text-lg">{step.emoji}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust note */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-muted">
            <span className="text-xl">🛡️</span>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Safety first:</span> All volunteers are verified, sessions are monitored, and guardians have full visibility.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
