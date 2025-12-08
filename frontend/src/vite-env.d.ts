/// <reference types="vite/client" />

declare module '*.png?url' {
  const src: string;
  export default src;
}

declare module '*.jpg?url' {
  const src: string;
  export default src;
}

declare module '*.svg?url' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_PROTECTED_ADMIN_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
