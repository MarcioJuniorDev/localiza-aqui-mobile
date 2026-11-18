
import { supabase } from "../../lib/supabase";
import { buscarReputacaoUsuario } from "./reputacao";

// Descobre o início da semana (segunda-feira).
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

// Verifica se houve publicações em 4 semanas consecutivas.
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

// Busca, calcula e salva as conquistas do usuário.
export async function buscarConquistasUsuario(usuarioId) {
    const { data: registros, error } = await supabase
        .from("registros")
        .select("idRegistro, criado_em")
        .eq("usuarioRegistro", usuarioId);

    if (error) throw error;

    const reputacao = await buscarReputacaoUsuario(usuarioId);

    const conquistas = [
        {
            id: "primeiro_registro",
            nome: "Primeiro registro",
            descricao: "Publique seu primeiro preço.",
            desbloqueada: registros.length >= 1,
        },
        {
            id: "famoso",
            nome: "Famoso",
            descricao: "Receba 10 curtidas nas suas publicações.",
            desbloqueada: reputacao.totalCurtidas >= 10,
        },
        {
            id: "frequente",
            nome: "Frequente",
            descricao: "Publique pelo menos uma vez por semana durante 4 semanas seguidas.",
            desbloqueada: verificarFrequencia(registros),
        },
        {
            id: "superb",
            nome: "Superb",
            descricao: "Alcance o rank máximo: Saphira.",
            desbloqueada: reputacao.rank === "Saphira",
        },
    ];

    // Busca conquistas já registradas.
    const { data: conquistasSalvas, error: erroSalvas } = await supabase
        .from("conquistas_usuario")
        .select("conquista_id")
        .eq("usuario_id", usuarioId);

    if (erroSalvas) throw erroSalvas;

    const idsSalvos = new Set(
        (conquistasSalvas || []).map(c => c.conquista_id)
    );

    // Registra somente conquistas novas.
    const novasConquistas = conquistas.filter(
        c => c.desbloqueada && !idsSalvos.has(c.id)
    );

    if (novasConquistas.length > 0) {
        const { error: erroInsert } = await supabase
            .from("conquistas_usuario")
            .insert(
                novasConquistas.map(c => ({
                    usuario_id: usuarioId,
                    conquista_id: c.id,
                }))
            );

        if (erroInsert) throw erroInsert;
    }

    // A tabela é a fonte permanente dos desbloqueios.
    return conquistas.map(c => ({
        ...c,
        desbloqueada:
            c.desbloqueada || idsSalvos.has(c.id) ||
            novasConquistas.some(n => n.id === c.id),
    }));
}
