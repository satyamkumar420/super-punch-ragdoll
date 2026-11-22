import { defineConfig, type Plugin } from 'vite';

function youtubePlayablesPlugin(): Plugin {
  const sdkScriptTag = '<script src="https://www.youtube.com/game_api/v1"></script>';

  return {
    name: 'vite-plugin-youtube-playables',
    enforce: 'post',
    transformIndexHtml(html) {
      // 1. Strip any existing YouTube SDK script tag
      const withoutSdk = html.replace(
        /<script\s+src="https:\/\/www\.youtube\.com\/game_api\/v1"><\/script>\s*/gi,
        ''
      );

      // 2. Re-inject YouTube SDK as the very first element right after <head...>
      // This ensures that in both development mode and production builds,
      // the YouTube SDK is strictly loaded before any other script.
      return withoutSdk.replace(/<head([^>]*)>/i, `<head$1>\n    ${sdkScriptTag}`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [youtubePlayablesPlugin()],
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
