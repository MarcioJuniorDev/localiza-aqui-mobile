// hooks/useFeed.js
import { useCallback, useEffect, useRef, useState } from "react";
import { buscarFeed } from "../services/feedService";

function normalizarItem(item) {
  if (!item || typeof item !== "object") return item;

  const idRegistro =
    item.idRegistro ??
    item.id_registro ??
    item.registroId ??
    item.idReg ??
    item.id;

  if (item.idRegistro == null) {
    console.warn("[useFeed] idRegistro ausente no item, usando fallback:", item);
  }

  const id = item.id != null ? String(item.id) : String(idRegistro);
  return { ...item, id, idRegistro };
}

/**
 * Mescla o cache local (fonte de verdade do que o usuário clicou)
 * por cima do que veio da API.
 */
function aplicarCacheLocal(items, curtidasLocais) {
  if (!curtidasLocais) return items;
  return items.map((it) => {
    const k = String(it.idRegistro);
    if (Object.prototype.hasOwnProperty.call(curtidasLocais, k)) {
      return { ...it, curtido: !!curtidasLocais[k] };
    }
    return it;
  });
}

export function useFeed({
  usuarioId = null,
  produtoId = null,
  enabled = true,
  curtidasLocais = null,   // { [idRegistro]: boolean }
} = {}) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadingRef = useRef(false);
  // guarda a versão mais recente do cache sem recriar a função a cada render
  const cacheRef = useRef(curtidasLocais);
  useEffect(() => {
    cacheRef.current = curtidasLocais;
  }, [curtidasLocais]);

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

        const base = (novos ?? []).map(normalizarItem);
        const normalizados = aplicarCacheLocal(base, cacheRef.current);

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

  // só busca quando o usuarioId está pronto (evita a 1ª req com null)
  useEffect(() => {
    if (!enabled) return;
    carregarPagina(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, produtoId, enabled]);

  const onEndReached = useCallback(() => {
    if (hasMore && !loadingRef.current) carregarPagina(false);
  }, [hasMore, carregarPagina]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarPagina(true);
  }, [carregarPagina]);

  const atualizarLikeLocal = useCallback((id, curtido, likes, idAutor, rank) => {
    setItems((prev) =>
      prev.map((r) => {
        const bate =
          String(r.id) === String(id) ||
          String(r.idRegistro) === String(id);
        const autor = rank && idAutor != null && String(r.usuario?.id) === String(idAutor);
        if (autor) r = { ...r, usuario: { ...r.usuario, rank } };
        if (!bate) return r;
        return {
          ...r,
          curtido,
          likes:
            likes != null
              ? likes
              : curtido
                ? (r.likes ?? 0) + 1
                : Math.max(0, (r.likes ?? 0) - 1),
        };
      })
    );
  }, []);

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