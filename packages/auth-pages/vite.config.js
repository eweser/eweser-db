import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: '/auth/',
    plugins: [react()],
    preview: {
        port: 3001,
    },
    server: {
        port: 3001,
    },
});
