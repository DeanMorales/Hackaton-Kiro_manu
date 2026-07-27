import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (mode === 'production' && !env.VITE_SCORES_API_URL) {
    throw new Error(
      '[Build] VITE_SCORES_API_URL is required for production builds. ' +
      'Set it in the Amplify Console environment variables.'
    );
  }

  return {};
});
