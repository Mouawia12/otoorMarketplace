import { create } from 'zustand';

interface UIState {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  isRTL: boolean;
}

export const useUIStore = create<UIState>((set) => ({
  language: 'ar',
  isRTL: true,
  setLanguage: (lang: 'en' | 'ar') => {
    set({ language: lang, isRTL: lang === 'ar' });
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }
}));
