import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  isRTL: boolean;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      language: 'ar',
      isRTL: true,
      setLanguage: (lang: 'en' | 'ar') => {
        set({ language: lang, isRTL: lang === 'ar' });
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      }
    }),
    {
      name: 'ui-settings',
      onRehydrateStorage: () => (state) => {
        const lang = state?.language ?? 'ar';
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      }
    }
  )
);
