import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
type CategoryChip = {
  id: number | string;
  name: { ar: string; en: string };
  slug: string;
};

interface CategoriesChipsProps {
  categories: CategoryChip[];
}

export default function CategoriesChips({ categories }: CategoriesChipsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'ar' | 'en';

  if (!categories.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-6">
        {t('home.shopByCategory')}
      </h2>
      
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex gap-3 min-w-max">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/search?category=${category.slug}`}
              className="px-6 py-3 bg-sand text-charcoal rounded-full font-semibold hover:bg-gold hover:shadow-luxury transition-all whitespace-nowrap"
            >
              {category.name[lang]}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
