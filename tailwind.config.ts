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
        // Faction colors
        horde: {
          DEFAULT: "hsl(var(--horde))",
          foreground: "hsl(var(--horde-foreground))",
          glow: "hsl(var(--horde-glow))",
        },
        alliance: {
          DEFAULT: "hsl(var(--alliance))",
          foreground: "hsl(var(--alliance-foreground))",
          glow: "hsl(var(--alliance-glow))",
        },
        // Role colors
        tank: "hsl(var(--tank))",
        healer: "hsl(var(--healer))",
        dps: "hsl(var(--dps))",
        // WoW Class colors
        "class-warrior": "hsl(var(--class-warrior))",
        "class-paladin": "hsl(var(--class-paladin))",
        "class-hunter": "hsl(var(--class-hunter))",
        "class-rogue": "hsl(var(--class-rogue))",
        "class-priest": "hsl(var(--class-priest))",
        "class-death-knight": "hsl(var(--class-death-knight))",
        "class-shaman": "hsl(var(--class-shaman))",
        "class-mage": "hsl(var(--class-mage))",
        "class-warlock": "hsl(var(--class-warlock))",
        "class-monk": "hsl(var(--class-monk))",
        "class-druid": "hsl(var(--class-druid))",
        "class-demon-hunter": "hsl(var(--class-demon-hunter))",
        "class-evoker": "hsl(var(--class-evoker))",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
        xl: "0.625rem",
        "2xl": "0.75rem",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(10px, -20px) scale(1.05)" },
          "50%": { transform: "translate(-5px, -10px) scale(0.95)" },
          "75%": { transform: "translate(-15px, -25px) scale(1.02)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", filter: "blur(80px)" },
          "50%": { opacity: "0.7", filter: "blur(100px)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "slide-in": "slide-in 0.3s ease-out",
        "float": "float 8s ease-in-out infinite",
        "float-delayed": "float 10s ease-in-out infinite -3s",
        "float-slow": "float 12s ease-in-out infinite -5s",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "gradient-shift": "gradient-shift 5s ease infinite",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
