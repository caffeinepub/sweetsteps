import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useOnboardingResult } from '../contexts/OnboardingResultContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, Mountain, Target, Footprints } from 'lucide-react';
import { toSafeString } from '../utils/safeRender';
import AuthenticatedHeader from '../components/AuthenticatedHeader';

const SWEET_SUMMIT_SEEN_KEY = 'sweetsteps_sweet_summit_seen';

export default function SweetSummit() {
  const navigate = useNavigate();
  const { onboardingResult, clearOnboardingResult } = useOnboardingResult();
  const [carouselSlide, setCarouselSlide] = useState(0);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && carouselSlide < 2) {
        setCarouselSlide(carouselSlide + 1);
      } else if (e.key === 'ArrowLeft' && carouselSlide > 0) {
        setCarouselSlide(carouselSlide - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carouselSlide]);

  if (!onboardingResult) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Onboarding Data</CardTitle>
            <CardDescription>
              It looks like you haven't completed onboarding yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                clearOnboardingResult();
                navigate({ to: '/onboarding' });
              }} 
              className="w-full"
            >
              Go to Onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { aiResponse } = onboardingResult;

  const goToNextSlide = () => {
    if (carouselSlide < 2) {
      setCarouselSlide(carouselSlide + 1);
    }
  };

  const goToPrevSlide = () => {
    if (carouselSlide > 0) {
      setCarouselSlide(carouselSlide - 1);
    }
  };

  const handleStartJourney = () => {
    console.log('[SweetSummit] User clicked Start Your Journey, marking Sweet Summit as seen');
    // Mark that user has now seen Sweet Summit
    localStorage.setItem(SWEET_SUMMIT_SEEN_KEY, 'true');
    console.log('[SweetSummit] Navigating to Weekly Mountain');
    navigate({ to: '/weekly-mountain' });
  };

  const carouselSlides = [
    {
      icon: Target,
      title: 'Your Big Goal',
      content: toSafeString(aiResponse.bigGoal),
      color: 'from-primary/20 to-accent/20'
    },
    {
      icon: Mountain,
      title: 'Your First Weekly Mountain',
      content: (
        <div className="space-y-3 text-left">
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-1">
              {toSafeString(aiResponse.weeklyMountain.name)}
            </h4>
            <p className="text-muted-foreground text-sm">Weekly Target</p>
            <p className="text-foreground whitespace-pre-wrap">
              {toSafeString(aiResponse.weeklyMountain.weeklyTarget)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Note</p>
            <p className="text-foreground whitespace-pre-wrap">
              {toSafeString(aiResponse.weeklyMountain.note)}
            </p>
          </div>
        </div>
      ),
      color: 'from-accent/20 to-secondary/20'
    },
    {
      icon: Footprints,
      title: 'Sample Daily SweetStep',
      content: toSafeString(aiResponse.dailyStep),
      color: 'from-secondary/20 to-primary/20'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header with Logout and Delete Account */}
      <AuthenticatedHeader title="Sweet Summit" />

      <div className="flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl mx-auto">
          <Card className="bg-transparent border-0 shadow-none">
            <CardHeader className="space-y-3 text-center">
              <CardTitle className="text-3xl font-bold text-card-foreground">
                Sweet Summit
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                Your personalized plan is ready!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Carousel Content */}
              <div className="relative overflow-hidden rounded-2xl h-[380px] md:h-[360px]">
                {carouselSlides.map((slide, index) => {
                  const IconComponent = slide.icon;
                  return (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                        index === carouselSlide
                          ? 'opacity-100 translate-x-0 z-10'
                          : index < carouselSlide
                          ? 'opacity-0 -translate-x-full z-0'
                          : 'opacity-0 translate-x-full z-0'
                      }`}
                    >
                      <Card className="bg-background border-border h-full">
                        <CardContent className="p-5 md:p-6 space-y-3 flex flex-col items-center text-center h-full overflow-y-auto">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${slide.color} flex items-center justify-center border border-border`}>
                            <IconComponent className="w-8 h-8 text-foreground" />
                          </div>
                          <h3 className="text-xl md:text-2xl font-bold text-foreground">{slide.title}</h3>
                          <div className="text-muted-foreground leading-relaxed text-sm md:text-base max-w-md">
                            {typeof slide.content === 'string' ? (
                              <p className="whitespace-pre-wrap">{slide.content}</p>
                            ) : (
                              slide.content
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={goToPrevSlide}
                  disabled={carouselSlide === 0}
                  className="flex items-center gap-2 rounded-xl border-border bg-card hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Back</span>
                </Button>

                {/* Slide Indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">
                    {carouselSlide + 1} of {carouselSlides.length}
                  </span>
                  <div className="flex gap-1.5">
                    {carouselSlides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCarouselSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === carouselSlide
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
                  disabled={carouselSlide === carouselSlides.length - 1}
                  className="flex items-center gap-2 rounded-xl border-border bg-card hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next slide"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Start Journey Button - Only show on slide 3 */}
              {carouselSlide === 2 && (
                <div className="pt-4">
                  <Button
                    size="lg"
                    onClick={handleStartJourney}
                    className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Start Your Journey
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-8 px-6 border-t border-border mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground text-xs md:text-sm">
            © 2026. Built with 🤎 using{' '}
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
    </div>
  );
}
