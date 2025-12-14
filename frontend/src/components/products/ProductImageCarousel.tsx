import { useMemo, useRef, useState, useEffect } from "react";
import type { TouchEvent, ReactNode } from "react";

interface ProductImageCarouselProps {
  images?: (string | null | undefined)[];
  name: string;
  fallback: string;
  dir?: "ltr" | "rtl";
  className?: string;
  overlay?: ReactNode;
}

const SWIPE_THRESHOLD = 40;

export default function ProductImageCarousel({
  images = [],
  name,
  fallback,
  dir = "ltr",
  className = "",
  overlay,
}: ProductImageCarouselProps) {
  const sanitized = useMemo(() => {
    const valid = images.filter((img): img is string => Boolean(img && img.trim().length));
    return valid.length > 0 ? valid : [fallback];
  }, [images, fallback]);

  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const isRtl = dir === "rtl";

  useEffect(() => {
    setActiveIndex(0);
  }, [sanitized]);

  const showControls = sanitized.length > 1;

  const goTo = (nextIndex: number) => {
    setActiveIndex(() => {
      const total = sanitized.length;
      if (!total) return 0;
      const normalized = ((nextIndex % total) + total) % total;
      return normalized;
    });
  };

  const handlePrev = () => goTo(activeIndex - 1);
  const handleNext = () => goTo(activeIndex + 1);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartX.current = null;
  };

  const indicatorOffset = overlay ? "bottom-16" : "bottom-3";

  return (
    <div className={`space-y-4 ${className}`.trim()} dir={dir}>
      <div className="relative group">
        <div
          className="overflow-hidden rounded-luxury bg-ivory aspect-square"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)`, direction: "ltr" }}
          >
            {sanitized.map((img, index) => (
              <img
                key={`${img}-${index}`}
                src={img || fallback}
                alt={`${name} ${index + 1}`}
                className="w-full h-full object-contain flex-shrink-0 bg-white"
                onError={(e) => {
                  e.currentTarget.src = fallback;
                }}
              />
            ))}
          </div>
        </div>

        {showControls && (
      <>
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous image"
          className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/80 text-charcoal shadow-md hover:bg-white absolute top-1/2 -translate-y-1/2 transition"
          style={isRtl ? { right: "12px" } : { left: "12px" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isRtl ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next image"
          className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/80 text-charcoal shadow-md hover:bg-white absolute top-1/2 -translate-y-1/2 transition"
          style={isRtl ? { left: "12px" } : { right: "12px" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isRtl ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
            />
          </svg>
        </button>
      </>
        )}

        {showControls && (
          <div className={`absolute ${indicatorOffset} inset-x-0 flex justify-center pointer-events-none`}>
            <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-full">
              {activeIndex + 1} / {sanitized.length}
            </span>
          </div>
        )}

        {overlay && (
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pointer-events-none">
            <div className="pointer-events-auto">{overlay}</div>
          </div>
        )}
      </div>

      {showControls && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sanitized.map((img, index) => (
            <button
              type="button"
              key={`${img}-thumb-${index}`}
              onClick={() => goTo(index)}
              className={`relative flex-none rounded-luxury overflow-hidden border-2 transition ${
                activeIndex === index ? "border-gold" : "border-transparent"
              }`}
              style={{ width: "80px", height: "80px" }}
            >
              <img
                src={img || fallback}
                alt={`${name} thumbnail ${index + 1}`}
                className="w-full h-full object-contain bg-white"
                onError={(e) => {
                  e.currentTarget.src = fallback;
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
