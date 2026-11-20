import { Stack } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure o Google Sign-In com o seu Web Client ID
GoogleSignin.configure({
  webClientId: '952954320383-cf0undat15c6oqdl9fod860k6js97q65.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}