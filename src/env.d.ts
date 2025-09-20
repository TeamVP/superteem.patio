/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_DEV_AUTH?: string;
  readonly VITE_DEV_JWT_SECRET?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
