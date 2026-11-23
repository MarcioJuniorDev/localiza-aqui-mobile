// hooks/useFeed.js
import { useCallback, useEffect, useRef, useState } from "react";
import { buscarFeed } from "../services/feedService";

/**
 * Garante que todo item do feed exponha:
 *  - idRegistro: chave bruta do banco (usada nas chamadas à API)
 *  - id: chave estável em string (usada pelo keyExtractor/estado local)
 */
function normalizarItem(item) {
  if (!item || typeof item !== "object") return item;

  // o feedService pode usar nomes diferentes; tentamos os mais comuns
  const idRegistro =
    item.idRegistro ??
    item.id_registro ??
    item.registroId ??
    item.idReg ??
    // fallback: se `id` já for numérico, é bem provável que seja o idRegistro
    (typeof item.id === "number" ? item.id : null);

  if (idRegistro == null) {
    console.warn(
      "[useFeed] Item sem idRegistro. Verifique o feedService. Item:",
      item
    );
  }

  // mantém `id` sempre string para evitar mismatch no estado local
  const id = item.id != null ? String(item.id) : String(idRegistro);

  return { ...item, id, idRegistro };
}

export function useFeed({ usuarioId = null, produtoId = null } = {}) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadingRef = useRef(false);

  const carregarPagina = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const {
          items: novos,
          proximoCursor,
          hasMore: temMais,
        } = await buscarFeed({
          cursor: reset ? null : cursor,
          usuarioId,
          produtoId,
        });

        const normalizados = (novos ?? []).map(normalizarItem);

        setItems((prev) => (reset ? normalizados : [...prev, ...normalizados]));
        setCursor(proximoCursor);
        setHasMore(temMais);
      } catch (e) {
        console.error("Erro no feed:", e);
        setError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
        loadingRef.current = false;
      }
    },
    [cursor, usuarioId, produtoId]
  );

  // primeira página
  useEffect(() => {
    carregarPagina(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, produtoId]);

  const onEndReached = () => {
    if (hasMore && !loadingRef.current) carregarPagina(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarPagina(true);
  };

  // atualização otimista de like — aceita `id` (local) ou `idRegistro`
  const atualizarLikeLocal = (id, curtido, likes) => {
    setItems((prev) =>
      prev.map((r) => {
        const bate =
          String(r.id) === String(id) ||
          String(r.idRegistro) === String(id);
        return bate ? { ...r, curtido, likes } : r;
      })
    );
  };

  return {
    items,
    loading,
    refreshing,
    hasMore,
    error,
    onEndReached,
    onRefresh,
    atualizarLikeLocal,
  };
}