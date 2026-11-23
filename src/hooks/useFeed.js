// hooks/useFeed.js
import { useCallback, useEffect, useRef, useState } from "react";
import { buscarFeed } from "../services/feedService";

export function useFeed({ usuarioId = null, produtoId = null } = {}) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadingRef = useRef(false);

  const carregarPagina = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { items: novos, proximoCursor, hasMore: temMais } = await buscarFeed({
        cursor: reset ? null : cursor,
        usuarioId,
        produtoId,
      });

      setItems((prev) => (reset ? novos : [...prev, ...novos]));
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
  }, [cursor, usuarioId, produtoId]);

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

  // atualização otimista de like
  const atualizarLikeLocal = (id, curtido, likes) => {
    setItems((prev) =>
      prev.map((r) =>
        r.id === String(id) ? { ...r, curtido, likes } : r
      )
    );
  };

  return { items, loading, refreshing, hasMore, error, onEndReached, onRefresh, atualizarLikeLocal };
}