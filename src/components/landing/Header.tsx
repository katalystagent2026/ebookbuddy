import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Book, Menu, X, Sparkles } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="safe-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-sky flex items-center justify-center shadow-glow-sky group-hover:scale-110 transition-transform duration-200">
                <Book className="w-5 h-5 text-primary-foreground" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent animate-sparkle" />
            </div>
            <span className="font-heading font-bold text-xl text-foreground">
              eBookBuddy
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              How It Works
            </a>
            <a href="#book-worlds" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Book Worlds
            </a>
            <a href="#for-schools" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              For Schools
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
            <Button variant="hero" size="default">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-3">
              <a href="#how-it-works" className="py-2 text-muted-foreground hover:text-foreground transition-colors font-medium">
                How It Works
              </a>
              <a href="#book-worlds" className="py-2 text-muted-foreground hover:text-foreground transition-colors font-medium">
                Book Worlds
              </a>
              <a href="#for-schools" className="py-2 text-muted-foreground hover:text-foreground transition-colors font-medium">
                For Schools
              </a>
              <div className="flex gap-3 pt-3 border-t border-border">
                <Button variant="ghost" size="sm" className="flex-1">
                  Sign In
                </Button>
                <Button variant="hero" size="sm" className="flex-1">
                  Get Started
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
