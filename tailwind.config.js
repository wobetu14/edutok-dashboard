/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#FE2C55', hover: '#e01f45', light: '#fff0f3' },
        secondary: { DEFAULT: '#25F4EE', hover: '#1dd6d0', light: '#f0fffe' },
        surface:   '#FFFFFF',
        bg:        '#F7F8FA',
        border:    '#E5E7EB',
        ink:       '#0D0D0D',
        muted:     '#6B7280',
        success:   '#10B981',
        warning:   '#F59E0B',
        danger:    '#EF4444',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card:     '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        dropdown: '0 4px 16px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};
