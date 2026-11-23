// utils/curtidasCache.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const prefixo = (usuarioId) => `@curtidas:${String(usuarioId)}`;

/**
 * Lê o mapa { idRegistro: boolean } persistido para o usuário.
 */
export async function lerCurtidasLocais(usuarioId) {
  if (usuarioId == null) return {};
  try {
    const raw = await AsyncStorage.getItem(prefixo(usuarioId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Salva uma curtida/descurtida localmente (chamado após a API responder OK).
 */
export async function salvarCurtidaLocal(usuarioId, idRegistro, curtido) {
  if (usuarioId == null || idRegistro == null) return;
  try {
    const raw = await AsyncStorage.getItem(prefixo(usuarioId));
    const mapa = raw ? JSON.parse(raw) : {};
    mapa[String(idRegistro)] = !!curtido;
    await AsyncStorage.setItem(prefixo(usuarioId), JSON.stringify(mapa));
  } catch (e) {
    console.error("Erro ao salvar curtida local:", e);
  }
}