/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CERTIFIER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
