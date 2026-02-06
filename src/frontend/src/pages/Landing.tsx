import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, Mountain } from 'lucide-react';
import { useCanisterWarmup } from '../hooks/useCanisterWarmup';

export default function Landing() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Pre-warm the canister automatically on mount
  useCanisterWarmup(true);

  const features = [
    {
      emoji: '🏔️',
      title: 'Weekly Mountains',
      description: 'Transform your long-term goals into weekly mountains. Each week is a new climb, making big dreams feel achievable.'
    },
    {
      emoji: '🍬',
      title: 'Daily SweetSteps',
      description: 'Take tiny steps that keep your momentum light and sweet. Small actions compound into remarkable progress.'
    },
    {
      emoji: '🍫',
      title: 'Earn Chocolates',
      description: 'Celebrate your wins with our fun reward system. Every step forward deserves a sweet treat.'
    }
  ];

  const goToNextSlide = () => {
    if (currentSlide < features.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentSlide(0);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowRight') {
        goToNextSlide();
      } else if (e.key === 'ArrowLeft') {
        goToPrevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, currentSlide]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
        <div className="w-full max-w-2xl mx-auto text-center space-y-8">
          {/* Mountain Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-border">
              <Mountain className="w-12 h-12 text-foreground" />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
              SweetSteps
            </h1>
            <p className="text-xl md:text-2xl text-foreground font-medium">
              A sweeter way to stay consistent.
            </p>
            <p className="text-base md:text-lg text-muted-foreground">
              Climb your goals one sweet step at a time.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full max-w-md mx-auto pt-4">
            <Link to="/signup">
              <Button 
                size="lg" 
                className="w-full text-base font-semibold h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Start Climbing
              </Button>
            </Link>
            
            <Link to="/login">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full text-base font-semibold h-12 rounded-xl border-border bg-card hover:bg-muted text-foreground"
              >
                Continue Climbing
              </Button>
            </Link>
            
            <Button 
              size="lg" 
              className="w-full text-base font-semibold h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setIsModalOpen(true)}
            >
              Why SweetSteps?
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-foreground text-sm md:text-base font-medium mb-4">
            No pressure. Just progress.
          </p>
          <p className="text-muted-foreground text-xs md:text-sm">
            © 2026. Built with love using{' '}
            <a 
              href="https://caffeine.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors underline underline-offset-2"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>

      {/* Modal Overlay with Carousel */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Why SweetSteps?</h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Carousel Content */}
            <div className="p-6 md:p-8">
              <div className="relative overflow-hidden min-h-[360px] md:min-h-[320px]">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                      index === currentSlide
                        ? 'opacity-100 translate-x-0'
                        : index < currentSlide
                        ? 'opacity-0 -translate-x-full'
                        : 'opacity-0 translate-x-full'
                    }`}
                  >
                    <Card className="bg-background border-border h-full">
                      <CardContent className="p-6 md:p-8 space-y-4 flex flex-col items-center text-center">
                        <div className="text-5xl md:text-6xl">{feature.emoji}</div>
                        <h3 className="text-2xl md:text-3xl font-bold text-foreground">{feature.title}</h3>
                        <p className="text-muted-foreground leading-relaxed text-base md:text-lg max-w-md">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between mt-6 gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={goToPrevSlide}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-2 rounded-xl border-border bg-card hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                {/* Slide Indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">
                    {currentSlide + 1} of {features.length}
                  </span>
                  <div className="flex gap-1.5">
                    {features.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentSlide
                            ? 'bg-primary w-6'
                            : 'bg-muted hover:bg-muted-foreground'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={goToNextSlide}
                  disabled={currentSlide === features.length - 1}
                  className="flex items-center gap-2 rounded-xl border-border bg-card hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next slide"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
