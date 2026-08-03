import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, BookOpen, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [canJoin, setCanJoin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setCanJoin(false);
      setCheckingAccess(false);
      return;
    }
    setCheckingAccess(true);
    (async () => {
      const { data, error } = await supabase.rpc("can_join_active_meeting", {
        _user_id: user.id,
      });
      if (cancelled) return;
      setCanJoin(!error && data === true);
      setCheckingAccess(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);


  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="safe-container py-4 flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">
            Welcome back!
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="safe-container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-2">
              What would you like to do?
            </h2>
            <p className="text-muted-foreground">
              Choose an option below to get started
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Online Meeting Room Card */}
            <Card
              className={
                canJoin
                  ? "cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-primary/50"
                  : "border-2 opacity-70"
              }
              onClick={() => canJoin && navigate("/meeting")}
            >
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-heading text-xl">Online Meeting Room</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  {canJoin
                    ? "Join a live video session with your reading buddy"
                    : "Available to verified volunteers assigned to the active meeting room"}
                </CardDescription>
                <Button variant="hero" className="w-full mt-4" disabled={!canJoin || checkingAccess}>
                  {checkingAccess ? "Checking access..." : "Join Meeting"}
                </Button>
              </CardContent>
            </Card>


            {/* eBooks Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-primary/50"
              onClick={() => navigate("/ebooks")}
            >
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="font-heading text-xl">eBooks</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Browse and read from our collection of interactive books
                </CardDescription>
                <Button variant="outline" className="w-full mt-4">
                  Browse Books
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
