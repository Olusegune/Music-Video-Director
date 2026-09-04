/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** "suite" (default, all 5 studios) or "musicvideo" (Music Video Director only). */
  readonly VITE_PRODUCT_EDITION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
