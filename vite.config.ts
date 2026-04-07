import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const proxyTarget = env.VITE_PROXY_TARGET?.trim() || 'http://127.0.0.1:3001';

    return {
        plugins: [react()],
        server: {
            host: '0.0.0.0',
            allowedHosts: ['nonresisting-rockingly-armanda.ngrok-free.dev'],
            proxy: {
                '/rooms': {
                    target: proxyTarget,
                    changeOrigin: true,
                },
                '/socket.io': {
                    target: proxyTarget,
                    changeOrigin: true,
                    ws: true,
                },
            },
        },
    };
});
