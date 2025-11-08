import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.freemind.vision',
  appName: 'FreeMind Vision',
  webDir: 'dist/public',
  // Note: Le bloc server est omis pour utiliser capacitor://localhost par défaut
  // Si vous voulez pointer vers une API déployée, décommentez et configurez:
  // server: {
  //   url: 'https://votre-api-deployee.com',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ec4899",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#ffffff"
    }
  }
};

export default config;
