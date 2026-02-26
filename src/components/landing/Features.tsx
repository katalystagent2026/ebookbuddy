import { BookOpen, Shield, Users, BarChart3, Sparkles, Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function Features() {
  const { t } = useI18n();

  const features = [
    { icon: BookOpen, title: t.liveReadingRoom, description: t.liveReadingRoomDesc, forKids: t.liveReadingRoomKids, forAdults: t.liveReadingRoomAdults },
    { icon: Users, title: t.buddyMatching, description: t.buddyMatchingDesc, forKids: t.buddyMatchingKids, forAdults: t.buddyMatchingAdults },
    { icon: Shield, title: t.safeMonitored, description: t.safeMonitoredDesc, forKids: t.safeMonitoredKids, forAdults: t.safeMonitoredAdults },
    { icon: BarChart3, title: t.progressTitle, description: t.progressDesc, forKids: t.progressKids, forAdults: t.progressAdults },
    { icon: Sparkles, title: t.readingGuide, description: t.readingGuideDesc, forKids: t.readingGuideKids, forAdults: t.readingGuideAdults },
    { icon: Clock, title: t.flexScheduling, description: t.flexSchedulingDesc, forKids: t.flexSchedulingKids, forAdults: t.flexSchedulingAdults },
  ];

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="safe-container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary-light text-primary-foreground text-sm font-medium mb-4">
            {t.featuresBadge}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-4">
            {t.featuresTitle}
          </h2>
          <p className="text-lg text-muted-foreground">{t.featuresSubtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card-warm p-6 group" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-sky flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200 shadow-glow-sky">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-heading font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">{feature.description}</p>
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
