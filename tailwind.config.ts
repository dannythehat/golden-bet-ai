import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        display: ['Anton', 'Outfit', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          glow: "hsl(var(--gold-glow))",
          dark: "hsl(var(--gold-dark))",
        },
        ice: {
          DEFAULT: "hsl(var(--ice))",
          glow: "hsl(var(--ice-glow))",
        },
        navy: {
          DEFAULT: "hsl(var(--navy))",
          dark: "hsl(var(--navy-dark))",
        },
        platinum: {
          DEFAULT: "hsl(var(--platinum))",
        },
        "neon-yellow": {
          DEFAULT: "hsl(var(--neon-yellow))",
          glow: "hsl(var(--neon-yellow-glow))",
        },
        stats: {
          DEFAULT: "hsl(var(--stats))",
          glow: "hsl(var(--stats-glow))",
        },
        "form-accent": {
          DEFAULT: "hsl(var(--form-accent))",
          glow: "hsl(var(--form-accent-glow))",
        },
        "bet-goals": {
          DEFAULT: "hsl(var(--bet-goals))",
          glow: "hsl(var(--bet-goals-glow))",
        },
        "bet-corners": {
          DEFAULT: "hsl(var(--bet-corners))",
          glow: "hsl(var(--bet-corners-glow))",
        },
        "bet-cards": {
          DEFAULT: "hsl(var(--bet-cards))",
          glow: "hsl(var(--bet-cards-glow))",
        },
        "bet-builder": {
          DEFAULT: "hsl(var(--bet-builder))",
          glow: "hsl(var(--bet-builder-glow))",
        },
        "bet-acca": {
          DEFAULT: "hsl(var(--bet-acca))",
          glow: "hsl(var(--bet-acca-glow))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-gold": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
