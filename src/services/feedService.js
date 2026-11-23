// services/feedService.js
import { supabase } from "../../lib/supabase";

const PAGE_SIZE = 10;

/**
 * Busca uma página do feed.
 * @param {object} opts
 * @param {string|null} opts.cursor - "criado_em|idRegistro" da última linha da página anterior
 * @param {string|number|null} opts.usuarioId - para saber "curtido por mim"
 * @param {string|number|null} opts.produtoId - filtro opcional (feed do produto)
 */
export async function buscarFeed({ cursor = null, usuarioId = null, produtoId = null } = {}) {
  // SELECT com joins (autor, mercado, produto) em UMA query
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

  // keyset: registros estritamente anteriores ao cursor
  if (cursor) {
    const [cursorData, cursorId] = String(cursor).split("|");
    query = query.or(
      `criado_em.lt.${cursorData},and(criado_em.eq.${cursorData},idRegistro.lt.${cursorId})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  // Quais desses o usuário curtiu? (1 query extra, só com os 10 ids)
  let curtidos = new Set();
  if (usuarioId && data.length > 0) {
    const ids = data.map((r) => r.idRegistro);
    const { data: curts, error: e2 } = await supabase
      .from("curtidas")
      .select("fkRegistro")
      .eq("fkUsuario", usuarioId)
      .in("fkRegistro", ids);
    if (e2) console.error("Erro curtidas:", e2);
    else curtidos = new Set(curts.map((c) => String(c.fkRegistro)));
  }

  const items = data.map((r) => ({
    id: String(r.idRegistro),
    preço: r["preço"],
    criado_em: r.criado_em,
    data: new Date(r.criado_em).toLocaleDateString("pt-BR"),
    likes: r.likes ?? 0,
    curtido: curtidos.has(String(r.idRegistro)),
    usuario: {
      id: String(r.usuarios?.idUsuario ?? ""),
      nome: r.usuarios?.nome ?? "—",
      foto_url: r.usuarios?.foto_url ?? null,
    },
    mercado: {
      id: r.mercados?.idMercado ?? null,
      nome: r.mercados?.nome ?? "Desconhecido",
    },
    produto: {
      id: r.produtos?.idProduto ?? null,
      nome: r.produtos?.nome ?? "",
    },
  }));

  // próximo cursor = último registro desta página
  const ultimo = data[data.length - 1];
  const proximoCursor = ultimo ? `${ultimo.criado_em}|${ultimo.idRegistro}` : null;

  return {
    items,
    proximoCursor,
    hasMore: data.length === PAGE_SIZE,
  };
}