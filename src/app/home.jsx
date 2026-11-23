import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { RegistroFeedItem } from "../components/RegistroFeedItem";
import { HeaderFeed } from "../components/HeaderFeed";
import { BarraNavegacao } from "../components/barraNavegação";
import { useFeed } from "../hooks/useFeed";
import { supabase } from "../../lib/supabase";
import { alternarCurtidaRegistro } from "../services/curtidasService";
import { lerCurtidasLocais, salvarCurtidaLocal } from "../utils/curtidasCache";

const IMAGENS = [
    require("../assets/img/imagem-fundo-home-1.jpg"),
    require("../assets/img/imagem-fundo-home-2.jpg"),
    require("../assets/img/imagem-fundo-home-3.jpg"),
    require("../assets/img/imagem-fundo-home-4.jpg"),
];

const CHAVE_USUARIO = "@usuario";

function paraNumero(valor) {
    if (valor == null) return 0;
    if (typeof valor === "number") return valor;
    return Number(String(valor).replace(",", ".")) || 0;
}

async function lerCarrinho() {
    try {
        const dados = await AsyncStorage.getItem("carrinho");
        return dados ? JSON.parse(dados) : [];
    } catch {
        return [];
    }
}

function paraMapa(carrinho) {
    return Object.fromEntries(carrinho.map((i) => [i.nome, i.quantidade]));
}

export default function Home() {
    const { pesquisa } = useLocalSearchParams();

    const [imagemIndex, setImagemIndex] = useState(0);
    const [usuarioId, setUsuarioId] = useState(null);
    const [usuarioCarregado, setUsuarioCarregado] = useState(false);
    const [curtidasLocais, setCurtidasLocais] = useState(null);
    const [quantidades, setQuantidades] = useState({});
    const [idProduto, setIdProduto] = useState("");

    useEffect(() => {
        const t = setInterval(() => {
            setImagemIndex((i) => (i + 1) % IMAGENS.length);
        }, 4000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        (async () => {
            const json = await AsyncStorage.getItem(CHAVE_USUARIO);
            const uid = json ? JSON.parse(json).idUsuario : null;
            setUsuarioId(uid);

            const mapa = await lerCurtidasLocais(uid);
            setCurtidasLocais(mapa);

            setUsuarioCarregado(true);

            if (!pesquisa) return;
            const { data, error } = await supabase
                .from("produtos")
                .select("idProduto")
                .eq("nome", pesquisa)
                .single();
            if (error) {
                console.error("❌ produto não encontrado:", pesquisa, error.message);
                return;
            }
            setIdProduto(data.idProduto);
        })();
    }, [pesquisa]);

    useFocusEffect(
        useCallback(() => {
            lerCarrinho().then((c) => setQuantidades(paraMapa(c)));
        }, [])
    );

    const {
        items,
        onEndReached,
        onRefresh,
        refreshing,
        loading,
        atualizarLikeLocal,
        error: feedError,
    } = useFeed({
        usuarioId,
        produtoId: idProduto,
        enabled: usuarioCarregado && curtidasLocais !== null,
        curtidasLocais,
    });

    async function handleCurtir(item) {
        const idRegistro = item.idRegistro;
        if (idRegistro == null) return;

        try {
            const resultado = await alternarCurtidaRegistro(idRegistro);
            atualizarLikeLocal(item.id, !!resultado?.curtido, resultado?.likes);

            if (usuarioId != null) {
                await salvarCurtidaLocal(usuarioId, idRegistro, !!resultado?.curtido);
                setCurtidasLocais((prev) => ({
                    ...(prev ?? {}),
                    [String(idRegistro)]: !!resultado?.curtido,
                }));
            }
        } catch (e) {
            console.error("Erro ao curtir:", e);
            alert(e.message);
        }
    }

    const adicionarCarrinho = useCallback(
        async (item) => {
            console.log("🛒 clicou no carrinho:", item?.produto);
            if (!item) return;

            const nome = item.produto?.nome || pesquisa;
            const id = item.produto?.id ?? (idProduto || null);
            if (!nome) {
                console.warn("🛒 sem nome de produto, abortando");
                return;
            }

            try {
                let registros = [];
                if (id != null) {
                    const { data, error } = await supabase
                        .from("registros")
                        .select("preço, mercadoRegistro, criado_em")
                        .eq("produtoRegistro", id);

                    if (error) console.error("🛒 erro ao buscar preços:", error);
                    else registros = data ?? [];
                }

                const precoDoMercado = (idMercado) => {
                    const doMercado = registros
                        .filter((r) => Number(r.mercadoRegistro) === idMercado)
                        .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
                    return paraNumero(doMercado[0]?.["preço"]);
                };

                const mercados = {
                    assai: precoDoMercado(1),
                    extra: precoDoMercado(2),
                    sonda: precoDoMercado(3),
                };

                const carrinhoAtual = await lerCarrinho();
                const existe = carrinhoAtual.some((i) => i.nome === nome);

                const novoCarrinho = existe
                    ? carrinhoAtual.map((i) =>
                        i.nome === nome
                            ? { ...i, quantidade: i.quantidade + 1, mercado: mercados }
                            : i
                    )
                    : [...carrinhoAtual, { id, nome, quantidade: 1, mercado: mercados }];

                await AsyncStorage.setItem("carrinho", JSON.stringify(novoCarrinho));
                console.log("🛒 carrinho salvo:", novoCarrinho);
                setQuantidades(paraMapa(novoCarrinho));
            } catch (e) {
                console.error("🛒 erro ao adicionar:", e);
            }
        },
        [pesquisa, idProduto]
    );

    const carregandoInicial = loading && items.length === 0;

    return (
        <View style={styles.screen}>
            <FlatList
                data={items}
                extraData={[items, quantidades]}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <RegistroFeedItem
                        registro={item}
                        onCurtir={() => handleCurtir(item)}
                        onAdicionarCarrinho={adicionarCarrinho}
                        quantidadeCarrinho={quantidades[item.produto?.nome] ?? 0}
                    />
                )}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.4}
                refreshing={refreshing}
                onRefresh={onRefresh}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListHeaderComponent={
                    <HeaderFeed
                        pesquisa={pesquisa}
                        imagemAtual={IMAGENS[imagemIndex]}
                        imagemIndex={imagemIndex}
                        totalImagens={IMAGENS.length}
                    />
                }
                ListEmptyComponent={
                    carregandoInicial ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#5A2A27" />
                            <Text style={styles.muted}>Buscando registros…</Text>
                        </View>
                    ) : feedError ? (
                        <View style={styles.center}>
                            <Text style={styles.erro}>Erro no feed</Text>
                            <Text style={styles.muted}>{feedError.message}</Text>
                        </View>
                    ) : (
                        <View style={styles.center}>
                            <Text style={styles.emptyEmoji}>🛒</Text>
                            <Text style={styles.emptyTitle}>Nada por aqui ainda</Text>
                            <Text style={styles.muted}>
                                Seja o primeiro a registrar um preço deste produto.
                            </Text>
                        </View>
                    )
                }
                ListFooterComponent={
                    loading && items.length > 0 ? (
                        <ActivityIndicator style={{ marginVertical: 24 }} color="#5A2A27" />
                    ) : null
                }
                initialNumToRender={10}
                windowSize={5}
                removeClippedSubviews
            />
            <BarraNavegacao />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#FEFAE0" },
    center: { alignItems: "center", justifyContent: "center", padding: 32, marginTop: 16 },
    muted: { color: "#888", fontSize: 13, textAlign: "center", marginTop: 6 },
    erro: { color: "#c0392b", fontWeight: "700", fontSize: 16 },
    emptyEmoji: { fontSize: 48, marginBottom: 8 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: "#283618" },
});