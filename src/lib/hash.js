// src/lib/hash.js
import * as Crypto from 'expo-crypto';

/**
 * Gera SHA-256 de "salt::senha".
 * O salt fica guardado junto com o hash no banco (formato "salt:hash").
 */
export async function hashSenha(senha) {
  const saltBytes = Crypto.getRandomBytes(16);
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}::${senha}`,
    { encoding: Crypto.CryptoEncoding.HEX }
  );

  return `${salt}:${hash}`;   // ex.: "a1b2c3...:9f8e7d..."
}

/**
 * Verifica se a senha informada bate com o hash armazenado.
 * @param {string} senha - senha digitada
 * @param {string} armazenado - string "salt:hash" vinda do banco
 */
export async function verificarSenha(senha, armazenado) {
  if (!armazenado || !armazenado.includes(':')) return false;

  const [salt, hashEsperado] = armazenado.split(':');
  const hashCalculado = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}::${senha}`,
    { encoding: Crypto.CryptoEncoding.HEX }
  );

  return hashCalculado === hashEsperado;
}