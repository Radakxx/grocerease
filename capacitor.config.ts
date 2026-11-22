import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.radakxx.grocerease',
  appName: 'GrocerEase',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
