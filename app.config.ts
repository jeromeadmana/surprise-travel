import type { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => ({
  name: 'Surprise Visit',
  slug: 'surprise-visit',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'surprisevisit',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.jeromeadmana.surprisevisit',
  },
  android: {
    package: 'com.jeromeadmana.surprisevisit',
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_MAPS_ANDROID_KEY,
      },
    },
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: { backgroundColor: '#000000' },
      },
    ],
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
        },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Surprise Visit uses your location to suggest nearby places to explore.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: 'af9b8f23-bb19-4765-95fd-3d8090546abe',
    },
  },
});
