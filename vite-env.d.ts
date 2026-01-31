
interface ImportMetaEnv {
  readonly VITE_REMOTE_PROXY_URL?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

