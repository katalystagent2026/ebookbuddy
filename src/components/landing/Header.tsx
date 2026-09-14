import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Book, Menu, X, Sparkles, LogOut, Shield, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { StudentRegistrationDialog } from './StudentRegistrationDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <>
    <StudentRegistrationDialog open={registrationOpen} onOpenChange={setRegistrationOpen} />
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="safe-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-sky flex items-center justify-center shadow-glow-sky group-hover:scale-110 transition-transform duration-200">
                <Book className="w-5 h-5 text-primary-foreground" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent animate-sparkle" />
            </div>
            <span className="font-heading font-bold text-xl text-foreground">
              eBookBuddy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              {t.howItWorks}
            </a>
            <a href="#book-worlds" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              {t.bookWorlds}
            </a>
            <a href="#for-schools" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              {t.forSchools}
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            {loading ? null : user ? (
              <>
                <Link to={isAdmin ? '/admin' : '/dashboard'}>
                  <Button variant="hero" size="default">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {isAdmin ? t.adminDashboard : t.dashboard}
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(user.email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.email}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {isAdmin ? t.administrator : t.member}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        {t.adminDashboard}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t.signOut}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="default">
                    {t.signIn}
                  </Button>
                </Link>
                <Button variant="hero" size="default" onClick={() => setRegistrationOpen(true)}>
                  {t.getStarted}
                </Button>
              </>
            )}
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
                {t.howItWorks}
              </a>
              <a href="#book-worlds" className="py-2 text-muted-foreground hover:text-foreground transition-colors font-medium">
                {t.bookWorlds}
              </a>
              <a href="#for-schools" className="py-2 text-muted-foreground hover:text-foreground transition-colors font-medium">
                {t.forSchools}
              </a>
              <div className="py-2">
                <LanguageSwitcher />
              </div>
              <div className="flex gap-3 pt-3 border-t border-border">
                {user ? (
                  <>
                    {isAdmin && (
                      <Link to="/admin" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Shield className="mr-2 h-4 w-4" />
                          {t.adminDashboard}
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" className="flex-1" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t.signOut}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full">
                        {t.signIn}
                      </Button>
                    </Link>
                    <Button variant="hero" size="sm" className="flex-1" onClick={() => setRegistrationOpen(true)}>
                      {t.getStarted}
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
    </>
  );
}
