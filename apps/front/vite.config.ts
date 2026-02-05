import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import createViteConfig from '../../vite.config'

export default defineConfig(createViteConfig('front', __dirname, [react()]))
