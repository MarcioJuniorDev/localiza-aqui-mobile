import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const CHAVE_USUARIO = '@usuario';

// NUNCA inclua "senha" aqui
const COLUNAS_PERFIL =
  '"idUsuario", nome, email, "CPF", foto_url, latitude, longitude, nivel, atualizado_em';

// lê o que foi salvo no login
export async function obterUsuarioLocal() {
  try {
    const json = await AsyncStorage.getItem(CHAVE_USUARIO);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error('Erro ao ler usuário local:', e);
    return null;
  }
}

// salva (mescla) no armazenamento local
export async function salvarUsuarioLocal(usuario) {
  try {
    await AsyncStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  } catch (e) {
    console.error('Erro ao salvar usuário local:', e);
  }
}

// busca o perfil completo no Supabase pelo id
export async function buscarUsuarioPorId(idUsuario) {
  if (!idUsuario) return null;

  const { data, error } = await supabase
    .from('usuarios')
    .select(COLUNAS_PERFIL)
    .eq('idUsuario', idUsuario)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar usuário:', error.message);
    throw error;
  }
  return data; // null se não existe ou se o RLS bloqueou
}

// junta tudo: pega o id local, busca no banco, atualiza o cache.
// Se o banco falhar (sem internet), usa o que está salvo localmente.
export async function carregarPerfil() {
  const local = await obterUsuarioLocal();
  if (!local?.idUsuario) return null;

  try {
    const remoto = await buscarUsuarioPorId(local.idUsuario);
    if (!remoto) return local;

    const atualizado = { ...local, ...remoto };
    await salvarUsuarioLocal(atualizado);
    return atualizado;
  } catch {
    return local;
  }
}