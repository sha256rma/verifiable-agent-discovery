/**
 * Design tokens for the verifiable-agent research prototype.
 *
 * Ported from the sibling SPOT Wallet project, which declares every colour once as an RGB
 * triplet CSS variable so a whole surface can be re-themed without touching a component.
 * Here that indirection earns its keep twice over: the CUSTOMER phone renders on a light
 * consumer-fintech canvas and the PROVIDER phone renders on a dark infrastructure canvas,
 * but both use the exact same component classes. The only difference is which palette is
 * bound to the variables (see `.theme-provider` in globals.css).
 *
 * Colour discipline is load-bearing for the experiment, not decoration:
 *   brand (emerald) .. ONLY verified / success
 *   danger (rose) ... ONLY verification failure
 *   warn (amber) .... ONLY warnings, incl. the provider's downgraded state
 *   ink ............. primary call-to-action buttons (near-black, Apple-ish)
 *
 * Rose appears nowhere except a failed verification, which is what makes that one screen land.
 *
 * @type {import('tailwindcss').Config}
 */
const config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // NOT named `base`: Tailwind's font-size scale already owns `text-base`,
        // and a color of the same name makes that utility emit BOTH a font-size
        // and a color. `.btn` uses text-base, so every button was one missing
        // colour class away from rendering canvas-on-canvas. Avoid color names
        // that collide with a size scale (xs, sm, base, lg, xl...).
        canvas: 'rgb(var(--vd-canvas) / <alpha-value>)',
        surface: 'rgb(var(--vd-surface) / <alpha-value>)',
        raised: 'rgb(var(--vd-raised) / <alpha-value>)',
        sunken: 'rgb(var(--vd-sunken) / <alpha-value>)',
        line: 'rgb(var(--vd-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--vd-line-strong) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--vd-ink) / <alpha-value>)',
          muted: 'rgb(var(--vd-ink-muted) / <alpha-value>)',
          subtle: 'rgb(var(--vd-ink-subtle) / <alpha-value>)',
          invert: 'rgb(var(--vd-ink-invert) / <alpha-value>)'
        },
        brand: {
          DEFAULT: 'rgb(var(--vd-brand) / <alpha-value>)',
          soft: 'rgb(var(--vd-brand-soft) / <alpha-value>)',
          deep: 'rgb(var(--vd-brand-deep) / <alpha-value>)',
          wash: 'rgb(var(--vd-brand-wash) / <alpha-value>)'
        },
        danger: {
          DEFAULT: 'rgb(var(--vd-danger) / <alpha-value>)',
          soft: 'rgb(var(--vd-danger-soft) / <alpha-value>)',
          wash: 'rgb(var(--vd-danger-wash) / <alpha-value>)'
        },
        warn: {
          DEFAULT: 'rgb(var(--vd-warn) / <alpha-value>)',
          wash: 'rgb(var(--vd-warn-wash) / <alpha-value>)'
        },
        info: 'rgb(var(--vd-info) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace']
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.02em' }]
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(var(--vd-shadow) / 0.04), 0 12px 32px -20px rgb(var(--vd-shadow) / 0.22)',
        lifted: '0 24px 56px -28px rgb(var(--vd-shadow) / 0.38)',
        glow: '0 0 0 1px rgb(var(--vd-brand) / 0.30), 0 12px 34px -16px rgb(var(--vd-brand) / 0.45)',
        'glow-danger': '0 0 0 1px rgb(var(--vd-danger) / 0.35), 0 14px 38px -14px rgb(var(--vd-danger) / 0.50)',
        'glow-warn': '0 0 0 1px rgb(var(--vd-warn) / 0.35), 0 12px 34px -16px rgb(var(--vd-warn) / 0.45)',
        sheet: '0 -20px 60px -20px rgb(var(--vd-shadow) / 0.45)'
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pop-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        'pulse-ring': { '0%': { transform: 'scale(0.85)', opacity: '0.7' }, '70%': { transform: 'scale(1.6)', opacity: '0' }, '100%': { transform: 'scale(1.6)', opacity: '0' } },
        sweep: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(220%)' } },
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.25' } },
        'scan-line': { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(400%)' } },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(5px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(2px)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        sweep: 'sweep 1.6s ease-in-out infinite',
        blink: 'blink 1.2s ease-in-out infinite',
        'scan-line': 'scan-line 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shake: 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both'
      }
    }
  },
  plugins: []
};

module.exports = config;
