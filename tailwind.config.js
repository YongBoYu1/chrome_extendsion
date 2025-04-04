/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{html,js}",
    "./popup/**/*.{html,js}",
    "./content/**/*.{html,js}",
    "./templates/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a73e8',
          dark: '#1967d2',
          light: 'rgba(26, 115, 232, 0.1)',
        },
        secondary: {
          DEFAULT: '#34a853',
          dark: '#1e8e3e',
          light: 'rgba(52, 168, 83, 0.08)',
        },
        accent: {
          DEFAULT: '#fbbc04',
          dark: '#f29900',
          light: 'rgba(251, 188, 4, 0.1)',
        },
        error: {
          DEFAULT: '#ea4335',
          dark: '#d93025',
          light: 'rgba(234, 67, 53, 0.08)',
        },
        text: {
          primary: '#202124',
          secondary: '#5f6368',
          muted: '#80868b',
        },
        surface: '#ffffff',
        card: '#f8f9fa',
        divider: '#e8eaed',
        highlight: '#f1f3f4',
        border: '#dadce0',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Helvetica Neue"', 'sans-serif'],
        serif: ['Inter', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        'xs': '0.875rem',    // 14px
        'sm': '1rem',        // 16px
        'base': '1.25rem',   // 20px
        'lg': '1.375rem',    // 22px
        'xl': '1.5rem',      // 24px
        '2xl': '1.875rem',   // 30px
        '3xl': '2.25rem',    // 36px
      },
      lineHeight: {
        'none': '1',
        'tight': '1.25',
        'snug': '1.375',
        'normal': '1.5',
        'relaxed': '1.8',
        'loose': '2',
      },
      letterSpacing: {
        'tight': '-0.02em',
        'normal': '0.01em',
      },
      maxWidth: {
        content: '740px',
        sidebar: '240px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        // Match CSS variables but let Tailwind handle most of this
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#202124',
            maxWidth: '100%',
            '--tw-prose-links': '#1967d2',
            '--tw-prose-headings': '#202124',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            h1: {
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.02em',
              fontWeight: '700',
            },
            h2: {
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.01em',
              fontWeight: '700',
            },
            h3: {
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.01em',
              fontWeight: '600',
            },
            p: {
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '1.8',
              letterSpacing: '0.01em',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 