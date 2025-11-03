import { useEffect, useRef, useState } from "react";
import { listTopTestimonials } from "../../../services/testimonialsService"; // نفس الخدمة التي أنشأتها/يها
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
  const { i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [items, setItems] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listTopTestimonials().then(setItems); }, []);

  // تحريك تلقائي كل 3 ثوانٍ (يوقف عند الوقوف بالماوس أو اللمس)
  useEffect(() => {
    const id = setInterval(() => {
      if (paused || !scrollerRef.current) return;
      const step = 320; // عرض البطاقة تقريبًا
      scrollerRef.current.scrollBy({ left: dir === "rtl" ? -step : step, behavior: "smooth" });

      const el = scrollerRef.current;
      const atEnd = el.scrollLeft + el.clientWidth + 4 >= el.scrollWidth;
      const atStart = el.scrollLeft <= 0;

      // لفّة لا نهائية بسيطة
      if (dir === "ltr" && atEnd) el.scrollTo({ left: 0, behavior: "auto" });
      if (dir === "rtl" && atStart) el.scrollTo({ left: el.scrollWidth, behavior: "auto" });
    }, 3000);
    return () => clearInterval(id);
  }, [paused, dir]);

  if (!items.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 pt-12 md:pt-18">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-2xl font-bold">آراء العملاء</h3>
        <div className="text-sm opacity-70">⭐⭐⭐⭐⭐ 4.8 / 5</div>
      </div>

      <div
        ref={scrollerRef}
        dir={dir}
        className="no-scrollbar flex gap-4 overflow-x-auto snap-x snap-mandatory py-1"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {items.map((t) => (
          <article
            key={t.id}
            className="snap-start min-w-[280px] md:min-w-[360px] bg-white rounded-xl shadow p-4 flex flex-col justify-between"
            aria-label="testimonial"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#EAE4D9] grid place-items-center font-semibold">
                {t.name?.slice(0,2)}
              </div>
              <div>
                <div className="font-semibold">{t.name}</div>
                {t.location_ar && <div className="text-xs opacity-70">{dir === "rtl" ? t.location_ar : t.location_en}</div>}
              </div>
            </div>

            <p className="text-sm leading-6 line-clamp-4 opacity-90">
              {dir === "rtl" ? t.text_ar : t.text_en}
            </p>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1" aria-label={`rating ${t.rating} of 5`}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} filled={i < t.rating} />)}
              </div>
              <span className="text-xs opacity-60">{t.date}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

