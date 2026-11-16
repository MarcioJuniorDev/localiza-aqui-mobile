// Tive que larpar os campos das tabelas pq nsei como entra no supabase e tals
// Depois tem que confirmar isso ai e ver se nao ta quebrando nada
// #falou

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { buscarReputacaoUsuario } from "./reputacao";

// Descobre quem está conectado no aplicativo
async function buscarUsuarioLogadoId() {
  const usuarioSalvo = await AsyncStorage.getItem("@usuario");

  if (!usuarioSalvo) {
    throw new Error("Você precisa estar conectado.");
  }

  let usuario;

  try {
    usuario = JSON.parse(usuarioSalvo);
  } catch {
    throw new Error("Os dados do usuário estão inválidos.");
  }

  if (usuario?.idUsuario == null) {
    throw new Error("Não foi possível identificar o usuário.");
  }

  return usuario.idUsuario;
}

// Adiciona ou remove uma curtida
export async function alternarCurtidaRegistro(idRegistro) {
  if (idRegistro == null) {
    throw new Error("É necessário informar a publicação.");
  }

  const idUsuario = await buscarUsuarioLogadoId();

  // Busca a publicação para descobrir seu autor
  const { data: registro, error: erroRegistro } = await supabase
    .from("registros")
    .select("idRegistro, usuarioRegistro")
    .eq("idRegistro", idRegistro)
    .single();

  if (erroRegistro) {
    throw new Error(
      `Não foi possível localizar a publicação: ${erroRegistro.message}`
    );
  }

  const idAutor = registro.usuarioRegistro;

  // Impede que alguém confirme a própria publicação
  if (String(idAutor) === String(idUsuario)) {
    throw new Error("Você não pode confirmar sua própria publicação.");
  }

  // Verifica se o usuário já curtiu
  const { data: curtidaExistente, error: erroBusca } = await supabase
    .from("curtidas")
    .select("fkRegistro, fkUsuario")
    .eq("fkRegistro", idRegistro)
    .eq("fkUsuario", idUsuario)
    .maybeSingle();

  if (erroBusca) {
    throw new Error(
      `Não foi possível verificar a curtida: ${erroBusca.message}`
    );
  }

  let curtido;

  if (curtidaExistente) {
    // Se já existe, remove a curtida
    const { error: erroRemocao } = await supabase
      .from("curtidas")
      .delete()
      .eq("fkRegistro", idRegistro)
      .eq("fkUsuario", idUsuario);

    if (erroRemocao) {
      throw new Error(
        `Não foi possível remover a curtida: ${erroRemocao.message}`
      );
    }

    curtido = false;
  } else {
    // Se não existe, adiciona a curtida
    const { error: erroInsercao } = await supabase
      .from("curtidas")
      .insert({
        fkRegistro: idRegistro,
        fkUsuario: idUsuario,
      });

    if (erroInsercao) {
      throw new Error(
        `Não foi possível adicionar a curtida: ${erroInsercao.message}`
      );
    }

    curtido = true;
  }

  // Recalcula a reputação do autor após a alteração
  const reputacaoAutor = await buscarReputacaoUsuario(idAutor);

  return {
    curtido,
    idUsuario,
    idAutor,
    reputacaoAutor,
  };
}
