import { BookOpen, Shield, Users, BarChart3, Sparkles, Clock } from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Live Reading Room',
    description: 'Share books in real-time with page-turn animations, word highlighting, and cozy reading prompts.',
    forKids: 'Feels like reading together on a couch',
    forAdults: 'Structured session with engagement tools',
  },
  {
    icon: Users,
    title: 'Buddy Matching',
    description: 'Smart matching based on schedule, interests, and reading level for the perfect reading partnership.',
    forKids: 'Meet your new reading friend',
    forAdults: 'Compatibility-based pairing system',
  },
  {
    icon: Shield,
    title: 'Safe & Monitored',
    description: 'Background checks, session monitoring, and guardian visibility at every step.',
    forKids: 'A safe place to learn',
    forAdults: 'Full transparency and controls',
  },
  {
    icon: BarChart3,
    title: 'Progress Without Pressure',
    description: 'Celebrate growth with stars and badges—never grades or red marks.',
    forKids: 'Collect stars as you read',
    forAdults: 'Literacy metrics and milestones',
  },
  {
    icon: Sparkles,
    title: 'Reading Guide AI',
    description: 'A gentle AI librarian suggests prompts, explains tricky words, and sparks curiosity.',
    forKids: 'A friendly helper when stuck',
    forAdults: 'Adaptive comprehension support',
  },
  {
    icon: Clock,
    title: 'Flexible Scheduling',
    description: 'Book sessions that work for everyone—morning, after school, or weekends.',
    forKids: 'Read when it works for you',
    forAdults: 'Calendar sync and reminders',
  },
];

export function Features() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="safe-container">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary-light text-primary-foreground text-sm font-medium mb-4">
            Magic Meets Structure
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-4">
            Built for Learning, Designed for Joy
          </h2>
          <p className="text-lg text-muted-foreground">
            Every feature balances magical delight for kids with grounded trust for adults.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="card-warm p-6 group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-sky flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200 shadow-glow-sky">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-heading font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {feature.description}
              </p>

              {/* Dual perspective */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex items-start gap-2">
                  <span className="text-sm">🧒</span>
                  <p className="text-sm text-foreground/80">{feature.forKids}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm">👩‍🏫</span>
                  <p className="text-sm text-foreground/80">{feature.forAdults}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
