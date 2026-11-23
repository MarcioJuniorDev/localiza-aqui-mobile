import { supabase } from "../../lib/supabase";

export const RANKS = [
    {
        nome: "Bronze",
        pontos: 0,
        publicacoesValidadas: 0
    },
    {
        nome: "Prata",
        pontos: 100,
        publicacoesValidadas: 5
    },
    {
        nome: "Ouro",
        pontos: 250,
        publicacoesValidadas: 15
    },
    {
        nome: "Ruby",
        pontos: 500,
        publicacoesValidadas: 30
    },
    {
        nome: "Saphira",
        pontos: 800,
        publicacoesValidadas: 50
    }
];


export function calcularPontosPublicacao(totalCurtidas) {

    if (totalCurtidas <= 0) return 0;

    let pontos = 8;

    if (totalCurtidas >= 2) pontos += 4;
    if (totalCurtidas >= 3) pontos += 4;

    if (totalCurtidas >= 4) {
        pontos += (totalCurtidas - 3) * 2;
    }

    return Math.min(pontos, 30);
}

export function calcularProgressoRank(pontos, publicacoesValidadas) {

    const rankAtual = [...RANKS].reverse().find(rank =>
        pontos >= rank.pontos &&
        publicacoesValidadas >= rank.publicacoesValidadas
    );

    const indiceAtual = RANKS.findIndex(
        rank => rank.nome === rankAtual.nome
    );

    // Saphira é o rank máximo
    if (indiceAtual === RANKS.length - 1) {
        return {
            proximoRank: null,
            progresso: 100,
            pontosRestantes: 0,
            publicacoesRestantes: 0
        };
    }

    const proximoRank = RANKS[indiceAtual + 1];

    const pontosNecessarios = proximoRank.pontos - rankAtual.pontos;
    const publicacoesNecessarias =
        proximoRank.publicacoesValidadas - rankAtual.publicacoesValidadas;

    const progressoPontos = Math.min(
        pontos / proximoRank.pontos,
        1
    );

    const progressoPublicacoes = Math.min(
        publicacoesValidadas / proximoRank.publicacoesValidadas,
        1
    );

    const progresso = Math.min(
        progressoPontos,
        progressoPublicacoes
    ) * 100;

    return {
        proximoRank: proximoRank.nome,
        progresso,
        pontosRestantes: Math.max(0, proximoRank.pontos - pontos),
        publicacoesRestantes: Math.max(
            0,
            proximoRank.publicacoesValidadas - publicacoesValidadas
        )
    };
}


export function calcularReputacao(registros, curtidas, idUsuario) {

    let pontosTotais = 0;
    let publicacoesValidadas = 0;
    let totalCurtidas = 0;

    registros.forEach((registro) => {

        // Seleciona as curtidas desta publicação
        // Exclui o próprio autor
        // Evita contar o mesmo usuário duas vezes

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

        // Calcula os pontos da publicação
        pontosTotais += calcularPontosPublicacao(quantidade);

        // Duas confirmações tornam a publicação validada
        if (quantidade >= 2) {
            publicacoesValidadas++;
        }
    });

    // Descobre o maior rank que o usuário alcançou
    const rankAtual = [...RANKS].reverse().find((rank) =>
        pontosTotais >= rank.pontos &&
        publicacoesValidadas >= rank.publicacoesValidadas
    );

    const progresso = calcularProgressoRank(
    pontosTotais,
    publicacoesValidadas
    );

    return {
        pontos: pontosTotais,
        publicacoesValidadas,
        totalCurtidas,
        rank: rankAtual.nome,
        ...progresso
    };
}


export async function buscarReputacaoUsuario(idUsuario) {

    // Busca publicações feitas pelo usuário
    const { data: registros, error: erroRegistros } =
        await supabase
            .from("registros")
            .select("idRegistro, usuarioRegistro")
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

    // Busca curtidas recebidas nessas publicações
    const ids = registros.map(r => r.idRegistro);

    const { data: curtidas, error: erroCurtidas } =
        await supabase
            .from("curtidas")
            .select("fkRegistro, fkUsuario")
            .in("fkRegistro", ids);

    if (erroCurtidas) throw erroCurtidas;

    // Calcula a reputação
    return {
        pontos: 0,
        publicacoesValidadas: 0,
        totalCurtidas: 0,
        rank: "Bronze",
        ...calcularProgressoRank(0, 0)
    };
}
