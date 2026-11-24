
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Usuário que estamos simulando como conectado
const idUsuarioLogado = 8;

const RANKS = [
    { nome: "Bronze", pontos: 0, publicacoesValidadas: 0 },
    { nome: "Prata", pontos: 100, publicacoesValidadas: 5 },
    { nome: "Ouro", pontos: 250, publicacoesValidadas: 15 },
    { nome: "Ruby", pontos: 500, publicacoesValidadas: 30 },
    { nome: "Saphira", pontos: 800, publicacoesValidadas: 50 }
];

function calcularPontosPublicacao(totalCurtidas) {
    if (totalCurtidas <= 0) return 0;

    let pontos = 8;

    if (totalCurtidas >= 2) pontos += 4;
    if (totalCurtidas >= 3) pontos += 4;
    if (totalCurtidas >= 4) pontos += (totalCurtidas - 3) * 2;

    return Math.min(pontos, 30);
}

function calcularReputacao(registros, curtidas, idUsuario) {
    let pontosTotais = 0;
    let publicacoesValidadas = 0;
    let totalCurtidas = 0;

    registros.forEach((registro) => {

        const usuariosQueConfirmaram = new Set(
            curtidas
                .filter((curtida) =>
                    String(curtida.fkRegistro) === String(registro.idRegistro) &&
                    String(curtida.fkUsuario) !== String(idUsuario)
                )
                .map((curtida) => String(curtida.fkUsuario))
        );

        const quantidade = usuariosQueConfirmaram.size;

        totalCurtidas += quantidade;
        pontosTotais += calcularPontosPublicacao(quantidade);

        if (quantidade >= 2) publicacoesValidadas++;
    });

    const rankAtual = [...RANKS].reverse().find((rank) =>
        pontosTotais >= rank.pontos &&
        publicacoesValidadas >= rank.publicacoesValidadas
    );

    return {
        pontos: pontosTotais,
        publicacoesValidadas,
        totalCurtidas,
        rank: rankAtual.nome
    };
}

async function buscarReputacaoUsuario(idUsuario) {

    const { data: registros, error: erroRegistros } = await supabase
        .from("registros")
        .select("idRegistro")
        .eq("usuarioRegistro", idUsuario);

    if (erroRegistros) throw erroRegistros;

    if (!registros || registros.length === 0) {
        return {
            pontos: 0,
            publicacoesValidadas: 0,
            totalCurtidas: 0,
            rank: "Bronze"
        };
    }

    const ids = registros.map(registro => registro.idRegistro);

    const { data: curtidas, error: erroCurtidas } = await supabase
        .from("curtidas")
        .select("fkRegistro, fkUsuario")
        .in("fkRegistro", ids);

    if (erroCurtidas) throw erroCurtidas;

    return calcularReputacao(
        registros,
        curtidas || [],
        idUsuario
    );
}

async function buscarRankingGeral() {

    // Busca todos os usuários
    const { data: usuarios, error } = await supabase
        .from("usuarios")
        .select("idUsuario, nome");

    if (error) throw error;

    // Calcula o XP de cada usuário
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

    // Ordena pelo XP
    ranking.sort((a, b) => b.xp - a.xp);

    // Define posição e identifica o usuário conectado
    const rankingFinal = ranking.map((usuario, indice) => ({
        ...usuario,
        posicao: indice + 1,
        usuarioLogado:
            String(usuario.idUsuario) === String(idUsuarioLogado)
    }));

    const usuarioAtual = rankingFinal.find(
        usuario => usuario.usuarioLogado
    );

    return {
        ranking: rankingFinal,
        posicaoUsuario: usuarioAtual?.posicao ?? null,
        xpUsuario: usuarioAtual?.xp ?? null,
        nomeUsuario: usuarioAtual?.nome ?? null
    };
}

async function testarRanking() {

    console.log("Buscando ranking geral...");

    try {

        const resultado = await buscarRankingGeral();

        console.log("\n===== RANKING GERAL =====");

        resultado.ranking.forEach(usuario => {

            console.log(
                `${usuario.posicao}º | ${usuario.nome} | ${usuario.xp} XP | ${usuario.rank}` +
                (usuario.usuarioLogado ? " <-- VOCÊ" : "")
            );

        });

        console.log("\n===== SUA POSIÇÃO =====");

        if (resultado.posicaoUsuario !== null) {

            console.log(
                `Você está na ${resultado.posicaoUsuario}ª posição do ranking!`
            );

            console.log(`Seu XP atual: ${resultado.xpUsuario}`);

        } else {

            console.log("Seu usuário não foi encontrado no ranking.");

        }

    } catch (error) {

        console.log("Erro ao buscar ranking:", error.message);

    }
}

testarRanking();