require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const idUsuario = 2;

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

console.log("\n===== TESTE DE PONTUAÇÃO =====");

for (let curtidas = 0; curtidas <= 15; curtidas++) {
    console.log(
        `${curtidas} curtidas = ${calcularPontosPublicacao(curtidas)} pontos`
    );
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

async function testarReputacao() {
    console.log("Buscando reputação do usuário:", idUsuario);

    const { data: registros, error: erroRegistros } = await supabase
        .from("registros")
        .select("idRegistro, usuarioRegistro")
        .eq("usuarioRegistro", idUsuario);

    if (erroRegistros) {
        console.log("Erro ao buscar registros:", erroRegistros.message);
        return;
    }

    if (!registros || registros.length === 0) {
        console.log("Esse usuário ainda não possui publicações.");
        return;
    }

    const ids = registros.map((registro) => registro.idRegistro);

    const { data: curtidas, error: erroCurtidas } = await supabase
        .from("curtidas")
        .select("fkRegistro, fkUsuario")
        .in("fkRegistro", ids);

    if (erroCurtidas) {
        console.log("Erro ao buscar curtidas:", erroCurtidas.message);
        return;
    }

    const reputacao = calcularReputacao(registros, curtidas || [], idUsuario);

    console.log("\n===== RESULTADO DA REPUTAÇÃO =====");
    console.log(reputacao);
}

console.log("\n===== TESTE DE VALIDAÇÃO =====");

const registrosTeste = [
    { idRegistro: 1 },
];

const curtidasTeste = [
    { fkRegistro: 1, fkUsuario: 2 },
    { fkRegistro: 1, fkUsuario: 3 },
];

console.log(
    calcularReputacao(registrosTeste, curtidasTeste, 1)
);

console.log("\n===== TESTE DE CURTIDA DUPLICADA =====");

const curtidasDuplicadas = [
    { fkRegistro: 1, fkUsuario: 2 },
    { fkRegistro: 1, fkUsuario: 2 },
    { fkRegistro: 1, fkUsuario: 3 },
];

console.log(
    calcularReputacao(registrosTeste, curtidasDuplicadas, 1)
);

console.log("\n===== TESTE DE AUTOCURTIDA =====");

const curtidasProprias = [
    { fkRegistro: 1, fkUsuario: 1 },
    { fkRegistro: 1, fkUsuario: 2 },
];

console.log(
    calcularReputacao(registrosTeste, curtidasProprias, 1)
);

console.log("\n===== TESTE DE PROGRESSÃO DE RANK =====");

const cenariosRank = [
    { pontos: 99, publicacoesValidadas: 4 },
    { pontos: 100, publicacoesValidadas: 5 },
    { pontos: 250, publicacoesValidadas: 15 },
    { pontos: 500, publicacoesValidadas: 30 },
    { pontos: 800, publicacoesValidadas: 50 },
];

cenariosRank.forEach((cenario) => {
    const rank = [...RANKS].reverse().find((r) =>
        cenario.pontos >= r.pontos &&
        cenario.publicacoesValidadas >= r.publicacoesValidadas
    );

    console.log(cenario, "=>", rank.nome);
});

testarReputacao();