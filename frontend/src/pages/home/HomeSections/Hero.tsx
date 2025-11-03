import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeroSlide } from '../../../services/homeService';

interface HeroProps {
  slides: HeroSlide[];
}

export default function Hero({ slides }: HeroProps) {
  const { i18n } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  if (!slides.length) return null;

  const slide = slides[currentSlide];
  const lang = i18n.language as 'ar' | 'en';

  return (
    <div 
      className="relative w-full h-[500px] md:h-[600px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((s, index) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={s.image}
            alt={s.title[lang]}
            className="w-full h-full object-cover"
            loading={index === 0 ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 to-charcoal/40" />
        </div>
      ))}

      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 w-full">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-ivory mb-4 animate-fade-in">
              {slide.title[lang]}
            </h1>
            <p className="text-lg md:text-xl text-sand mb-8 animate-fade-in-delay">
              {slide.subtitle[lang]}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to={slide.primaryCta.link}
                className="bg-gold text-charcoal px-8 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors shadow-luxury"
              >
                {slide.primaryCta.text[lang]}
              </Link>
              {slide.secondaryCta && (
                <Link
                  to={slide.secondaryCta.link}
                  className="bg-transparent border-2 border-ivory text-ivory px-8 py-3 rounded-lg font-semibold hover:bg-ivory/10 transition-colors"
                >
                  {slide.secondaryCta.text[lang]}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-gold w-8' 
                  : 'bg-ivory/50 hover:bg-ivory/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
