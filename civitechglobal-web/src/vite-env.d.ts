/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Currently unused — see the note in .env.example. */
  readonly VITE_TELEGRAM_BOT_URL: string;
  /** Optional analytics — see .env.example and src/lib/analytics.ts. */
  readonly VITE_UMAMI_SRC?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  readonly VITE_GA4_ID?: string;
  /** Optional verified social profiles for the Organization schema. */
  readonly VITE_SOCIAL_INSTAGRAM?: string;
  readonly VITE_SOCIAL_LINKEDIN?: string;
  readonly VITE_SOCIAL_GITHUB?: string;
  readonly VITE_SOCIAL_X?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
