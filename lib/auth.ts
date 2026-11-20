// lib/auth.ts
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

export async function entrarComGoogle() {
  try {
    // 1. Verifica se o Google Play Services está disponível (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // 2. Abre a tela de login do Google
    const userInfo = await GoogleSignin.signIn();

    // A API do google-signin pode retornar em formatos diferentes dependendo da versão.
    // Este código cobre o formato mais comum (v13+):
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      throw new Error('idToken não retornado pelo Google.');
    }

    // 3. Envia o idToken para a sua Edge Function
    const { data, error } = await supabase.functions.invoke('google-signin', {
      body: { idToken },
    });

    if (error) {
      throw new Error(`Erro na Edge Function: ${error.message}`);
    }

    if (!data?.user) {
      throw new Error('Resposta da função inválida: user não encontrado.');
    }

    // 4. Salva a sessão no armazenamento seguro do dispositivo
    await SecureStore.setItemAsync(
      'session',
      JSON.stringify({
        userId: data.user.id,
        email: data.user.email,
        nome: data.user.nome,
      })
    );

    return data.user;
  } catch (error: any) {
    console.error('Erro no login com Google:', error);
    // Repassa o erro para a tela poder mostrar um alerta
    throw error;
  }
}