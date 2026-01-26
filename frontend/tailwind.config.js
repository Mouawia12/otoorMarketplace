import lineClamp from '@tailwindcss/line-clamp';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#1A1A1A',
          light: '#2A2A2A',
          dark: '#0A0A0A'
        },
        gold: {
          DEFAULT: '#C8A24A',
          hover: '#B28E3E',
          light: '#D4B566',
          dark: '#9F7D32'
        },
        ivory: {
          DEFAULT: '#F7F5F2',
          light: '#FFFFFF',
          dark: '#EAE4D9'
        },
        sand: '#EAE4D9',
        taupe: '#B8A68C',
        success: '#2E7D6F',
        alert: '#E26D5A'
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif']
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }]
      },
      borderRadius: {
        'luxury': '12px'
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 4px 16px rgba(0, 0, 0, 0.12)'
      },
      spacing: {
        '8': '8px',
        '16': '16px',
        '24': '24px',
        '32': '32px'
      }
    },
  },
  plugins: [lineClamp],
}
