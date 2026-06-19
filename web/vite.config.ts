import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const parentDir = path.resolve(__dirname, '..')
  const parentEnv = loadEnv(mode, parentDir, '')
  const webEnv = loadEnv(mode, __dirname, '')

  const mappedFromParent: Record<string, string> = {}
  if (parentEnv.NEXT_PUBLIC_INSFORGE_URL && !webEnv.VITE_INSFORGE_URL) {
    mappedFromParent.VITE_INSFORGE_URL = parentEnv.NEXT_PUBLIC_INSFORGE_URL
  }
  if (parentEnv.NEXT_PUBLIC_INSFORGE_ANON_KEY && !webEnv.VITE_INSFORGE_ANON_KEY) {
    mappedFromParent.VITE_INSFORGE_ANON_KEY = parentEnv.NEXT_PUBLIC_INSFORGE_ANON_KEY
  }
  if (parentEnv.VAPI_PUBLIC_KEY && !webEnv.VITE_VAPI_PUBLIC_KEY) {
    mappedFromParent.VITE_VAPI_PUBLIC_KEY = parentEnv.VAPI_PUBLIC_KEY
  }
  if (parentEnv.VAPI_ASSISTANT_ID && !webEnv.VITE_VAPI_ASSISTANT_ID) {
    mappedFromParent.VITE_VAPI_ASSISTANT_ID = parentEnv.VAPI_ASSISTANT_ID
  }

  return {
    plugins: [react()],
    envDir: __dirname,
    define: Object.fromEntries(
      Object.entries(mappedFromParent).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ]),
    ),
  }
})
