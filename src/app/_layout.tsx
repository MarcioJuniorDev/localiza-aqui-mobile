import { Stack } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure o Google Sign-In com o seu Web Client ID
GoogleSignin.configure({
  webClientId: 'SEU_WEB_CLIENT_ID.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}