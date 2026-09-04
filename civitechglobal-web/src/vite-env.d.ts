/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Currently unused — see the note in .env.example. */
  readonly VITE_TELEGRAM_BOT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
