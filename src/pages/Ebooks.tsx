import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

const Ebooks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="safe-container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-heading font-bold text-foreground">
              eBooks Library
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="safe-container py-12">
        <div className="text-center">
          <div className="w-24 h-24 rounded-3xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-12 w-12 text-accent" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
            Coming Soon
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Our eBooks library is being curated. Check back soon for an amazing collection of interactive reading materials!
          </p>
        </div>
      </main>
    </div>
  );
};

export default Ebooks;
