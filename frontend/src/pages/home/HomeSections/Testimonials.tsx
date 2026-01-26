import { useEffect, useMemo, useState } from "react";
import { listTopTestimonials } from "../../../services/testimonialsService";
import { useTranslation } from "react-i18next";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24"
      className={filled ? "fill-[#C8A24A]" : "fill-[#E0E0E0]"} aria-hidden>
      <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848 1.417 8.268L12 19.771l-7.417 4.093L6 15.596 0 9.748l8.332-1.73z"/>
    </svg>
  );
}

export default function Testimonials() {
  const { i18n, t } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [items, setItems] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(1);
  const [page, setPage] = useState(0);

  useEffect(() => { listTopTestimonials().then(setItems); }, []);

  useEffect(() => {
    const resolvePerView = () => {
      const width = window.innerWidth;
      if (width >= 1280) return 3;
      if (width >= 768) return 2;
      return 1;
    };
    const apply = () => setPerView(resolvePerView());
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const pageCount = Math.max(1, Math.ceil(items.length / perView));

  useEffect(() => {
    if (page >= pageCount) {
      setPage(pageCount - 1);
    }
  }, [page, pageCount]);

  useEffect(() => {
    if (paused || pageCount <= 1) return;
    const id = window.setInterval(() => {
      setPage((prev) => (prev + 1) % pageCount);
    }, 4000);
    return () => window.clearInterval(id);
  }, [paused, pageCount]);

  const visibleItems = useMemo(() => {
    const start = page * perView;
    return items.slice(start, start + perView);
  }, [items, page, perView]);

  const handlePrev = () => setPage((prev) => (prev - 1 + pageCount) % pageCount);
  const handleNext = () => setPage((prev) => (prev + 1) % pageCount);

  if (!items.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 pt-12 md:pt-18 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h3 className="text-2xl font-bold text-charcoal">{t("home.testimonials")}</h3>
          <p className="text-sm text-taupe">{t("home.testimonialsSubtitle")}</p>
        </div>
        <div className="text-sm opacity-70">⭐⭐⭐⭐⭐ 4.8 / 5</div>
      </div>

      <div
        dir={dir}
        className="space-y-3"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-xl shadow p-4 flex flex-col justify-between min-h-[180px]"
              aria-label="testimonial"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#EAE4D9] grid place-items-center font-semibold">
                  {item.name?.slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold">{item.name}</div>
                  {item.location_ar && (
                    <div className="text-xs opacity-70">
                      {dir === "rtl" ? item.location_ar : item.location_en}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm leading-6 line-clamp-4 opacity-90">
                {dir === "rtl" ? item.text_ar : item.text_en}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1" aria-label={`rating ${item.rating} of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} filled={i < item.rating} />
                  ))}
                </div>
                <span className="text-xs opacity-60">{item.date}</span>
              </div>
            </article>
          ))}
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-luxury border border-sand text-charcoal text-sm font-semibold hover:bg-sand/60 transition"
                aria-label="Previous testimonials"
              >
                {t("common.previous", "Previous")}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-3 py-1.5 rounded-luxury border border-sand text-charcoal text-sm font-semibold hover:bg-sand/60 transition"
                aria-label="Next testimonials"
              >
                {t("common.next", "Next")}
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: pageCount }).map((_, index) => {
                const active = index === page;
                return (
                  <button
                    key={`dot-${index}`}
                    type="button"
                    onClick={() => setPage(index)}
                    className={`h-2.5 rounded-full transition ${
                      active ? "w-6 bg-gold" : "w-2.5 bg-sand"
                    }`}
                    aria-label={`Go to testimonial page ${index + 1}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
