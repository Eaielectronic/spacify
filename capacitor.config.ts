import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spacify.player',
  appName: 'Spacify Player',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  }
};

export default config;
