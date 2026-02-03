import { Book, Sparkles, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-card py-16">
      <div className="safe-container">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Logo & mission */}
          <div className="md:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-sky flex items-center justify-center">
                  <Book className="w-5 h-5 text-primary-foreground" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent" />
              </div>
              <span className="font-heading font-bold text-xl text-card">
                eBookBuddy
              </span>
            </a>
            <p className="text-card/70 max-w-sm leading-relaxed">
              A literacy and mentorship platform where magic draws kids in, structure earns trust, and kindness keeps everyone coming back.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-heading font-bold text-card mb-4">Explore</h4>
            <ul className="space-y-3">
              <li>
                <a href="#how-it-works" className="text-card/70 hover:text-card transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#book-worlds" className="text-card/70 hover:text-card transition-colors">
                  Book Worlds
                </a>
              </li>
              <li>
                <a href="#for-schools" className="text-card/70 hover:text-card transition-colors">
                  For Schools
                </a>
              </li>
              <li>
                <a href="#" className="text-card/70 hover:text-card transition-colors">
                  Become a Volunteer
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading font-bold text-card mb-4">Resources</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-card/70 hover:text-card transition-colors">
                  Safety Guidelines
                </a>
              </li>
              <li>
                <a href="#" className="text-card/70 hover:text-card transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-card/70 hover:text-card transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-card/70 hover:text-card transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-card/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-card/50 text-sm">
              © {new Date().getFullYear()} eBookBuddy. All rights reserved.
            </p>
            <p className="text-card/50 text-sm flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-destructive fill-destructive" /> for young readers everywhere
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
