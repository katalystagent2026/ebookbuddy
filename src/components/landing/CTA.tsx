import { Button } from '@/components/ui/button';
import { BookOpen, Heart, ArrowRight } from 'lucide-react';

export function CTA() {
  return (
    <section id="for-schools" className="py-20 md:py-28 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
      <div className="safe-container">
        <div className="relative">
          {/* Decorative elements */}
          <div className="absolute top-0 left-10 w-20 h-20 rounded-full bg-accent/20 blur-2xl" />
          <div className="absolute bottom-0 right-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative bg-card rounded-3xl p-8 md:p-12 lg:p-16 shadow-medium border border-border overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-4 left-4 text-6xl">📚</div>
              <div className="absolute top-1/3 right-8 text-5xl">⭐</div>
              <div className="absolute bottom-8 left-1/4 text-4xl">✨</div>
              <div className="absolute bottom-4 right-1/3 text-5xl">📖</div>
            </div>

            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              {/* Content */}
              <div className="text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-6">
                  Ready to Start{' '}
                  <span className="text-gradient-magic">Reading Together?</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Whether you're a student eager to explore new stories, a volunteer ready to make a difference, or a school seeking a safe reading program—we're here for you.
                </p>

                {/* Dual CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button variant="hero" size="lg" className="group gentle-pulse">
                    <BookOpen className="w-5 h-5" />
                    Start Reading
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button variant="forest" size="lg">
                    <Heart className="w-5 h-5" />
                    Become a Volunteer
                  </Button>
                </div>
              </div>

              {/* Stats/testimonials */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-2xl p-6 text-center">
                  <div className="text-4xl font-heading font-bold text-primary mb-2">5,000+</div>
                  <p className="text-sm text-muted-foreground">Stories Shared</p>
                </div>
                <div className="bg-muted rounded-2xl p-6 text-center">
                  <div className="text-4xl font-heading font-bold text-secondary mb-2">200+</div>
                  <p className="text-sm text-muted-foreground">Partner Schools</p>
                </div>
                <div className="bg-muted rounded-2xl p-6 text-center">
                  <div className="text-4xl font-heading font-bold text-accent-foreground mb-2">98%</div>
                  <p className="text-sm text-muted-foreground">Happy Readers</p>
                </div>
                <div className="bg-muted rounded-2xl p-6 text-center">
                  <div className="text-4xl font-heading font-bold text-foreground mb-2">∞</div>
                  <p className="text-sm text-muted-foreground">Adventures Ahead</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* School CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Interested in bringing eBookBuddy to your school or organization?
          </p>
          <Button variant="outline" size="lg">
            Partner With Us
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
