// services/feedService.js
import { supabase } from "../../lib/supabase";

import { buscarRanksAutores } from "./reputacao";

const PAGE_SIZE = 10;

export async function buscarFeed({ cursor = null, usuarioId = null, produtoId = null } = {}) {
  let query = supabase
    .from("registros")
    .select(`
      idRegistro,
      preço,
      criado_em,
      likes,
      usuarioRegistro,
      mercadoRegistro,
      produtoRegistro,
      usuarios:usuarioRegistro ( idUsuario, nome, foto_url ),
      mercados:mercadoRegistro ( idMercado, nome ),
      produtos:produtoRegistro ( idProduto, nome )
    `)
    .order("criado_em", { ascending: false })
    .order("idRegistro", { ascending: false })
    .limit(PAGE_SIZE);

  if (produtoId) query = query.eq("produtoRegistro", produtoId);

  if (cursor) {
    const [cursorData, cursorId] = String(cursor).split("|");
    query = query.or(
      `criado_em.lt.${cursorData},and(criado_em.eq.${cursorData},idRegistro.lt.${cursorId})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  // Conta curtidas e descobre as do usuário em UMA query só
  const contagem = {};            // { idRegistro: total }
  const curtidosPorMim = new Set(); // ids que o usuário logado curtiu

  if (data.length > 0) {
    const ids = data.map((r) => r.idRegistro);
    const { data: curts, error: e2 } = await supabase
      .from("curtidas")
      .select("fkRegistro, fkUsuario")
      .in("fkRegistro", ids);

    if (e2) {
      console.error("Erro curtidas:", e2);
    } else {
      (curts ?? []).forEach((c) => {
        const k = String(c.fkRegistro);
        contagem[k] = (contagem[k] || 0) + 1;
        if (usuarioId != null && String(c.fkUsuario) === String(usuarioId)) {
          curtidosPorMim.add(k);
        }
      });
    }
  }

  const ranks = await buscarRanksAutores(data.map(r => r.usuarioRegistro));

  const items = data.map((r) => {
    const k = String(r.idRegistro);
    return {
      id: k,                     // mantém o keyExtractor funcionando
      idRegistro: r.idRegistro,  // <-- A CHAVE QUE FALTAVA
      preço: r["preço"],
      criado_em: r.criado_em,
      data: new Date(r.criado_em).toLocaleDateString("pt-BR"),
      likes: contagem[k] || 0,   // <-- agora vem de curtidas, não da coluna
      curtido: curtidosPorMim.has(k),
      usuario: {
        id: String(r.usuarios?.idUsuario ?? ""),
        nome: r.usuarios?.nome ?? "—",
        foto_url: r.usuarios?.foto_url ?? null,
        rank: ranks[String(r.usuarioRegistro)] ?? null,
      },
      mercado: {
        id: r.mercados?.idMercado ?? null,
        nome: r.mercados?.nome ?? "Desconhecido",
      },
      produto: {
        id: r.produtos?.idProduto ?? null,
        nome: r.produtos?.nome ?? "",
      },
    };
  });

  const ultimo = data[data.length - 1];
  const proximoCursor = ultimo ? `${ultimo.criado_em}|${ultimo.idRegistro}` : null;

  function normalizarItem(item) {
  if (!item || typeof item !== "object") return item;

  const idRegistro =
    item.idRegistro ??
    item.id_registro ??
    item.registroId ??
    item.idReg ??
    item.id; // fallback: no feedService atual, id = String(idRegistro)

  if (item.idRegistro == null) {
    console.warn("[useFeed] idRegistro ausente no item, usando fallback:", item);
  }

  const id = item.id != null ? String(item.id) : String(idRegistro);

  return { ...item, id, idRegistro };
}

  return {
    items,
    proximoCursor,
    hasMore: data.length === PAGE_SIZE,
  };
}