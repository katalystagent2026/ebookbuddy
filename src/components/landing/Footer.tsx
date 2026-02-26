import { Book, Sparkles, Heart } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-foreground text-card py-16">
      <div className="safe-container">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-sky flex items-center justify-center">
                  <Book className="w-5 h-5 text-primary-foreground" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent" />
              </div>
              <span className="font-heading font-bold text-xl text-card">eBookBuddy</span>
            </a>
            <p className="text-card/70 max-w-sm leading-relaxed">{t.footerMission}</p>
          </div>

          <div>
            <h4 className="font-heading font-bold text-card mb-4">{t.explore}</h4>
            <ul className="space-y-3">
              <li><a href="#how-it-works" className="text-card/70 hover:text-card transition-colors">{t.howItWorks}</a></li>
              <li><a href="#book-worlds" className="text-card/70 hover:text-card transition-colors">{t.bookWorlds}</a></li>
              <li><a href="#for-schools" className="text-card/70 hover:text-card transition-colors">{t.forSchools}</a></li>
              <li><a href="#" className="text-card/70 hover:text-card transition-colors">{t.becomeVolunteer}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-card mb-4">{t.resources}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-card/70 hover:text-card transition-colors">{t.safetyGuidelines}</a></li>
              <li><a href="#" className="text-card/70 hover:text-card transition-colors">{t.privacyPolicy}</a></li>
              <li><a href="#" className="text-card/70 hover:text-card transition-colors">{t.termsOfService}</a></li>
              <li><a href="#" className="text-card/70 hover:text-card transition-colors">{t.contactUs}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-card/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-card/50 text-sm">© {new Date().getFullYear()} eBookBuddy. {t.allRightsReserved}</p>
            <p className="text-card/50 text-sm flex items-center gap-1">
              {t.madeWith} <Heart className="w-4 h-4 text-destructive fill-destructive" /> {t.forYoungReaders}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
