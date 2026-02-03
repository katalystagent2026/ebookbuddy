import { Button } from '@/components/ui/button';
import { ArrowRight, Compass, Heart, Lightbulb } from 'lucide-react';
import worldAdventure from '@/assets/world-adventure.jpg';
import worldFriendship from '@/assets/world-friendship.jpg';
import worldCuriosity from '@/assets/world-curiosity.jpg';

const worlds = [
  {
    title: 'Adventure',
    description: 'Brave quests, magical kingdoms, and heroes who never give up',
    image: worldAdventure,
    icon: Compass,
    bookCount: 48,
    color: 'from-amber-400/20 to-orange-400/20',
    borderColor: 'border-amber-300/50',
  },
  {
    title: 'Friendship',
    description: 'Stories about kindness, sharing, and the friends we make along the way',
    image: worldFriendship,
    icon: Heart,
    bookCount: 36,
    color: 'from-emerald-400/20 to-teal-400/20',
    borderColor: 'border-emerald-300/50',
  },
  {
    title: 'Curiosity',
    description: 'Discover dinosaurs, planets, science, and the wonders of our world',
    image: worldCuriosity,
    icon: Lightbulb,
    bookCount: 52,
    color: 'from-sky-400/20 to-indigo-400/20',
    borderColor: 'border-sky-300/50',
  },
];

export function BookWorlds() {
  return (
    <section id="book-worlds" className="py-20 md:py-28 bg-muted/50">
      <div className="safe-container">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-accent-light text-accent-foreground text-sm font-medium mb-4 sparkle">
            Explore & Discover
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-4">
            Enter the Book Worlds
          </h2>
          <p className="text-lg text-muted-foreground">
            Every story belongs to a magical world. Which one will you explore today?
          </p>
        </div>

        {/* World cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {worlds.map((world, index) => (
            <div
              key={world.title}
              className="group book-world-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className={`relative aspect-square overflow-hidden bg-gradient-to-br ${world.color}`}>
                <img
                  src={world.image}
                  alt={`${world.title} book world - ${world.description}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                
                {/* Icon badge */}
                <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-soft">
                  <world.icon className="w-6 h-6 text-primary" />
                </div>

                {/* Book count */}
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm text-sm font-medium text-foreground shadow-soft">
                  {world.bookCount} books
                </div>

                {/* Content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-heading font-bold text-card mb-2">
                    {world.title}
                  </h3>
                  <p className="text-card/90 text-sm leading-relaxed mb-4">
                    {world.description}
                  </p>
                  <Button 
                    variant="heroOutline" 
                    size="sm" 
                    className="bg-card/20 border-card/50 text-card hover:bg-card hover:text-foreground"
                  >
                    Explore World
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reading levels note */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Books for every reader</span> — 
            from picture books to chapter books, matched to your reading level
          </p>
        </div>
      </div>
    </section>
  );
}
