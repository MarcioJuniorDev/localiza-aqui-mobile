import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';


import { verificarSenha, hashSenha } from '../lib/hash';

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

export async function buscarHashSenha(idUsuario) {
    if (!idUsuario) return null;

    const { data, error } = await supabase
        .from('usuarios')
        .select('senha')
        .eq('idUsuario', idUsuario)
        .maybeSingle();

    if (error) throw error;
    return data?.senha ?? null;
}

// confere a senha atual e grava a nova (com hash)
export async function atualizarSenha(idUsuario, senhaAtual, novaSenha) {
    const hashAtual = await buscarHashSenha(idUsuario);
    if (!hashAtual) return { success: false, error: 'Usuário não encontrado.' };

    const ok = await verificarSenha(senhaAtual, hashAtual);
    if (!ok) return { success: false, error: 'Senha atual incorreta.' };

    const novoHash = await hashSenha(novaSenha);

    const { data, error } = await supabase
        .from('usuarios')
        .update({ senha: novoHash, atualizado_em: new Date().toISOString() })
        .eq('idUsuario', idUsuario)
        .select('"idUsuario"');

    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
        return { success: false, error: 'Sem permissão para atualizar (verifique a policy de UPDATE).' };
    }
    return { success: true };
}

// atualiza campos do perfil e sincroniza o cache local
export async function atualizarPerfil(idUsuario, campos) {
    if (!idUsuario) return { success: false, error: 'Usuário não identificado.' };

    const { data, error } = await supabase
        .from('usuarios')
        .update({ ...campos, atualizado_em: new Date().toISOString() })
        .eq('idUsuario', idUsuario)
        .select(COLUNAS_PERFIL);

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'Já existe um usuário com esse nome.' };
        }
        return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
        return { success: false, error: 'Sem permissão para atualizar (verifique a policy de UPDATE).' };
    }

    const local = await obterUsuarioLocal();
    const atualizado = { ...local, ...data[0] };
    await salvarUsuarioLocal(atualizado);

    return { success: true, data: atualizado };
}

// envia a foto escolhida para o Storage e devolve a URL pública
export async function enviarFoto(idUsuario, uri) {
    const ext = (uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
    const caminho = `${idUsuario}/${Date.now()}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

    const { error } = await supabase.storage
        .from('avatares')
        .upload(caminho, decode(base64), {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: true,
        });

    if (error) throw error;

    const { data } = supabase.storage.from('avatares').getPublicUrl(caminho);
    return data.publicUrl;
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