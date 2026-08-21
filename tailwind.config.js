/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
        colors: {
          highlight: '#000000',
          muted: '#6B7280',   
          background: '#f9fafb', 
        },
        fontFamily: {
          sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
          serif: ['var(--font-nanum-myeongjo)', '"Nanum Myeongjo"', 'serif'],
        },
        borderRadius: {
          xl: '1rem',
          '2xl': '1.5rem',
        },
        boxShadow: {
          soft: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
        transformStyle: {
          'preserve-3d': 'preserve-3d',
        },
        perspective: {
          '1000': '1000px',
        },
        rotate: {
          'x-2': 'rotateX(2deg)',
          'x-1': 'rotateX(1deg)',
        },
      },
  },
  plugins: [],
}
