import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

let commitCount = '48'
let commitHash = ''
try {
  commitCount = execSync('git rev-list --count HEAD').toString().trim()
  commitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch(e) {}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`1.${commitCount}`),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  }
})
