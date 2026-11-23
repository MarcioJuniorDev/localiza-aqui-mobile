require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const idUsuario = 8;

function inicioDaSemana(data) {
    const dataPublicacao = new Date(data);
    dataPublicacao.setHours(0, 0, 0, 0);

    const dia = dataPublicacao.getDay();
    const diasDesdeSegunda = (dia + 6) % 7;

    dataPublicacao.setDate(
        dataPublicacao.getDate() - diasDesdeSegunda
    );

    return dataPublicacao.getTime();
}

function verificarFrequencia(registros) {
    const semanas = [
        ...new Set(
            registros.map(registro =>
                inicioDaSemana(registro.criado_em)
            )
        ),
    ].sort((a, b) => a - b);

    let sequencia = 1;

    for (let i = 1; i < semanas.length; i++) {
        const diferenca = semanas[i] - semanas[i - 1];
        const umaSemana = 7 * 24 * 60 * 60 * 1000;

        sequencia = diferenca === umaSemana
            ? sequencia + 1
            : 1;

        if (sequencia >= 4) return true;
    }

    return false;
}

console.log("\n===== TESTE DE FREQUÊNCIA =====");

const hoje = new Date();

const registrosTeste = [];

for (let semana = 0; semana < 4; semana++) {
    const data = new Date(hoje);
    data.setDate(data.getDate() - (semana * 7));

    registrosTeste.push({
        criado_em: data.toISOString()
    });
}

console.log(
    "4 semanas consecutivas:",
    verificarFrequencia(registrosTeste)
);

async function testarConquistas() {
    console.log("Buscando conquistas do usuário:", idUsuario);

    const { data: registros, error: erroRegistros } = await supabase
        .from("registros")
        .select("idRegistro, criado_em")
        .eq("usuarioRegistro", idUsuario);

    if (erroRegistros) {
        console.log("Erro ao buscar registros:", erroRegistros.message);
        return;
    }

    const ids = (registros || []).map(registro => registro.idRegistro);

    let curtidas = [];

    if (ids.length > 0) {
        const { data, error } = await supabase
            .from("curtidas")
            .select("fkRegistro, fkUsuario")
            .in("fkRegistro", ids);

        if (error) {
            console.log("Erro ao buscar curtidas:", error.message);
            return;
        }

        curtidas = data || [];

        console.log("\nIDs das publicações do usuário:", ids);

        console.log("\nCurtidas encontradas no banco:", curtidas);

        console.log(
            "\nCurtidas feitas pelo próprio usuário:",
        curtidas.filter(c => String(c.fkUsuario) === String(idUsuario))
);
    }

    const usuariosQueCurtiram = new Set(
        curtidas
            .filter(curtida => String(curtida.fkUsuario) !== String(idUsuario))
            .map(curtida => String(curtida.fkUsuario) + "-" + String(curtida.fkRegistro))
    );

    const totalCurtidas = usuariosQueCurtiram.size;

    const RANKS = [
        { nome: "Bronze", pontos: 0, publicacoesValidadas: 0 },
        { nome: "Prata", pontos: 100, publicacoesValidadas: 5 },
        { nome: "Ouro", pontos: 250, publicacoesValidadas: 15 },
        { nome: "Ruby", pontos: 500, publicacoesValidadas: 30 },
        { nome: "Saphira", pontos: 800, publicacoesValidadas: 50 }
    ];

    let pontos = 0;
    let publicacoesValidadas = 0;

    registros.forEach(registro => {
        const confirmacoes = new Set(
            curtidas
                .filter(c =>
                    String(c.fkRegistro) === String(registro.idRegistro) &&
                    String(c.fkUsuario) !== String(idUsuario)
                )
                .map(c => String(c.fkUsuario))
        );

        const quantidade = confirmacoes.size;

        if (quantidade >= 2) publicacoesValidadas++;

        if (quantidade > 0) {
            let pontosPublicacao = 8;

            if (quantidade >= 2) pontosPublicacao += 4;
            if (quantidade >= 3) pontosPublicacao += 4;
            if (quantidade >= 4) pontosPublicacao += (quantidade - 3) * 2;

            pontos += Math.min(pontosPublicacao, 30);
        }
    });

    const rank = [...RANKS].reverse().find(r =>
        pontos >= r.pontos &&
        publicacoesValidadas >= r.publicacoesValidadas
    );

    const conquistas = [
        {
            nome: "Primeiro registro",
            desbloqueada: registros.length >= 1
        },
        {
            nome: "Famoso",
            desbloqueada: totalCurtidas >= 10
        },
        {
            nome: "Frequente",
            desbloqueada: verificarFrequencia(registros)
        },
        {
            nome: "Superb",
            desbloqueada: rank.nome === "Saphira"
        }
    ];


    // Busca conquistas já salvas no Supabase.
    const { data: salvas, error: erroSalvas } = await supabase
        .from("conquistas_usuario")
        .select("conquista_id")
        .eq("usuario_id", idUsuario);

    if (erroSalvas) {
        console.log("Erro ao buscar conquistas salvas:", erroSalvas.message);
        return;
    }

    const idsSalvos = new Set(
        (salvas || []).map(c => c.conquista_id)
    );

    // Separa somente as conquistas novas.
    const novas = conquistas.filter(
        c => c.desbloqueada && !idsSalvos.has(
            c.nome === "Primeiro registro" ? "primeiro_registro" :
            c.nome === "Famoso" ? "famoso" :
            c.nome === "Frequente" ? "frequente" :
            "superb"
        )
    );

    const idsConquistas = {
        "Primeiro registro": "primeiro_registro",
        "Famoso": "famoso",
        "Frequente": "frequente",
        "Superb": "superb"
    };

    if (novas.length > 0) {
        const { error: erroInsert } = await supabase
            .from("conquistas_usuario")
            .insert(
                novas.map(c => ({
                    usuario_id: idUsuario,
                    conquista_id: idsConquistas[c.nome]
                }))
            );

        if (erroInsert) {
            console.log("Erro ao salvar conquistas:", erroInsert.message);
            return;
        }

        console.log("\nNovas conquistas salvas:", novas.map(c => c.nome));
    } else {
        console.log("\nNenhuma conquista nova para salvar.");
    }


    console.log("\n===== RESULTADO DAS CONQUISTAS =====");

    console.log("Registros:", registros.length);
    console.log("Curtidas recebidas:", totalCurtidas);
    console.log("Pontos:", pontos);
    console.log("Rank:", rank.nome);

    conquistas.forEach(conquista => {
        console.log(
            `${conquista.desbloqueada ? "[DESBLOQUEADA]" : "[BLOQUEADA]"} ${conquista.nome}`
        );
    });
}


testarConquistas();
