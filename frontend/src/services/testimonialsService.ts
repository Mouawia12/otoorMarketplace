export interface Testimonial {
  id: number;
  name: string;
  avatar?: string;
  rating: number;
  text_ar: string;
  text_en: string;
  date: string;
  location_ar?: string;
  location_en?: string;
}

export const listTopTestimonials = async (): Promise<Testimonial[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  return [
    {
      id: 1,
      name: 'أحمد السعيد',
      rating: 5,
      text_ar: 'تجربة رائعة! حصلت على عطر أصلي بسعر ممتاز من خلال المزاد. الشحن كان سريع والتغليف احترافي جداً. بالتأكيد سأشتري مرة أخرى.',
      text_en: 'Amazing experience! Got an authentic perfume at a great price through the auction. Shipping was fast and packaging was very professional. Will definitely buy again.',
      date: '2024-09-15',
      location_ar: 'الرياض، السعودية',
      location_en: 'Riyadh, Saudi Arabia',
    },
    {
      id: 2,
      name: 'Fatima Al-Harbi',
      rating: 5,
      text_ar: 'منصة موثوقة ومميزة. أعجبني نظام التوثيق للبائعين وجودة المنتجات المعروضة. العطور الفاخرة متوفرة بأسعار منافسة.',
      text_en: 'Trustworthy and excellent platform. I loved the seller verification system and the quality of products offered. Luxury perfumes available at competitive prices.',
      date: '2024-09-28',
      location_ar: 'جدة، السعودية',
      location_en: 'Jeddah, Saudi Arabia',
    },
    {
      id: 3,
      name: 'Mohammed Al-Qahtani',
      rating: 5,
      text_ar: 'أفضل موقع لشراء العطور الفاخرة في المملكة. فزت بمزاد على عطر كريد أفينتوس بسعر رائع. خدمة العملاء ممتازة وسريعة الرد.',
      text_en: 'Best website for buying luxury perfumes in the Kingdom. Won an auction for Creed Aventus at an amazing price. Customer service is excellent and very responsive.',
      date: '2024-10-02',
      location_ar: 'الدمام، السعودية',
      location_en: 'Dammam, Saudi Arabia',
    },
    {
      id: 4,
      name: 'Sara Abdullah',
      rating: 4,
      text_ar: 'تجربة جيدة بشكل عام. المنتجات أصلية ومضمونة. تمنيت لو كانت هناك خيارات توصيل أسرع، لكن بشكل عام أنا راضية عن الخدمة.',
      text_en: 'Overall good experience. Products are authentic and guaranteed. I wish there were faster delivery options, but overall I am satisfied with the service.',
      date: '2024-09-20',
      location_ar: 'الخبر، السعودية',
      location_en: 'Khobar, Saudi Arabia',
    },
    {
      id: 5,
      name: 'Khalid Al-Dosari',
      rating: 5,
      text_ar: 'المزادات الحية مثيرة جداً! ربحت عطر توم فورد بسعر أقل من السوق بكثير. النظام واضح وسهل الاستخدام.',
      text_en: 'Live auctions are very exciting! Won a Tom Ford perfume at a much lower price than the market. The system is clear and easy to use.',
      date: '2024-10-05',
      location_ar: 'مكة، السعودية',
      location_en: 'Makkah, Saudi Arabia',
    },
    {
      id: 6,
      name: 'Noura Al-Mutairi',
      rating: 5,
      text_ar: 'أحب التشكيلة الواسعة من العطور الفاخرة المستعملة بحالة ممتازة. وفرت الكثير مع الحفاظ على الجودة. شكراً عالم العطور!',
      text_en: 'I love the wide selection of pre-owned luxury perfumes in excellent condition. Saved a lot while maintaining quality. Thank you Aalam Al-Otoor!',
      date: '2024-09-18',
      location_ar: 'المدينة المنورة، السعودية',
      location_en: 'Madinah, Saudi Arabia',
    },
    {
      id: 7,
      name: 'Abdulrahman Saleh',
      rating: 4,
      text_ar: 'خدمة ممتازة ومنتجات أصلية. الموقع سهل الاستخدام باللغتين. أنصح به لمحبي العطور الفاخرة.',
      text_en: 'Excellent service and authentic products. The website is easy to use in both languages. I recommend it to luxury perfume lovers.',
      date: '2024-09-25',
      location_ar: 'أبها، السعودية',
      location_en: 'Abha, Saudi Arabia',
    },
    {
      id: 8,
      name: 'Layla Al-Zahrani',
      rating: 5,
      text_ar: 'عطوري المفضلة من ديور وشانيل متوفرة هنا بأسعار معقولة. التطبيق سلس والدفع آمن. تجربة تسوق رائعة!',
      text_en: 'My favorite perfumes from Dior and Chanel are available here at reasonable prices. The app is smooth and payment is secure. Great shopping experience!',
      date: '2024-10-01',
      location_ar: 'الطائف، السعودية',
      location_en: 'Taif, Saudi Arabia',
    },
  ];
};
