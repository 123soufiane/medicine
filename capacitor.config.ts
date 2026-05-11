import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dawaOuk.app',
  appName: 'DawaOuk',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#7c3aed'
  }
};

export default config;
