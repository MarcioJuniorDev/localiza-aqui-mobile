
import { supabase } from "../../lib/supabase";
import { buscarReputacaoUsuario } from "./reputacao";

export async function buscarRankingGeral(idUsuarioLogado) {

    // Busca todos os usuários cadastrados
    const { data: usuarios, error } = await supabase
        .from("usuarios")
        .select("idUsuario, nome");

    if (error) throw error;

    // Calcula o XP e o rank de cada usuário
    const ranking = await Promise.all(
        usuarios.map(async (usuario) => {

            const reputacao = await buscarReputacaoUsuario(
                usuario.idUsuario
            );

            return {
                idUsuario: usuario.idUsuario,
                nome: usuario.nome,
                xp: reputacao.pontos,
                rank: reputacao.rank
            };
        })
    );

    // Ordena do maior XP para o menor
    ranking.sort((a, b) => b.xp - a.xp);

    // Define a posição e identifica o usuário logado
    const rankingFinal = ranking.map((usuario, indice) => ({
        ...usuario,
        posicao: indice + 1,
        usuarioLogado:
            String(usuario.idUsuario) === String(idUsuarioLogado)
    }));

    // Localiza o usuário logado no ranking
    const usuarioAtual = rankingFinal.find(
        usuario => usuario.usuarioLogado
    );

    // Retorna o ranking e o resumo da posição do usuário
    return {
        ranking: rankingFinal,
        posicaoUsuario: usuarioAtual?.posicao ?? null,
        xpUsuario: usuarioAtual?.xp ?? null,
        nomeUsuario: usuarioAtual?.nome ?? null
    };
}