import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { RegistroFeedItem } from "../components/RegistroFeedItem";
import { HeaderFeed } from "../components/HeaderFeed";
import { BarraNavegacao } from "../components/barraNavegação";
import { useFeed } from "../hooks/useFeed";
import { supabase } from "../../lib/supabase";
import { alternarCurtidaRegistro } from "../services/curtidasService";

const IMAGENS = [
    require("../assets/img/imagem-fundo-home-1.jpg"),
    require("../assets/img/imagem-fundo-home-2.jpg"),
    require("../assets/img/imagem-fundo-home-3.jpg"),
    require("../assets/img/imagem-fundo-home-4.jpg"),
];

const CHAVE_USUARIO = "@usuario";

export default function Home() {
    const { pesquisa } = useLocalSearchParams();

    const [imagemIndex, setImagemIndex] = useState(0);
    const [usuarioId, setUsuarioId] = useState(null);
    const [quantidadeCarrinho, setQuantidadeCarrinho] = useState(0);
    const [idProduto, setIdProduto] = useState("");

    // carrossel
    useEffect(() => {
        const t = setInterval(() => {
            setImagemIndex((i) => (i + 1) % IMAGENS.length);
        }, 4000);
        return () => clearInterval(t);
    }, []);

    // usuário + carrinho + produto
    useEffect(() => {
        (async () => {
            const json = await AsyncStorage.getItem(CHAVE_USUARIO);
            if (json) setUsuarioId(JSON.parse(json).idUsuario);

            const dadosCarrinho = await AsyncStorage.getItem("carrinho");
            const carrinho = dadosCarrinho ? JSON.parse(dadosCarrinho) : [];
            const item = carrinho.find((i) => i.nome === pesquisa);
            setQuantidadeCarrinho(item?.quantidade ?? 0);

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

    // feed
    const {
        items,
        onEndReached,
        onRefresh,
        refreshing,
        loading,
        atualizarLikeLocal,
        error: feedError,
    } = useFeed({ usuarioId, produtoId: idProduto });

    // curtir
    async function handleCurtir(item) {
        const idRegistro = item.idRegistro;
        if (idRegistro == null) {
            console.warn("Item sem idRegistro:", item);
            return;
        }

        try {
            const resultado = await alternarCurtidaRegistro(idRegistro);

            const likesAtuais = item.likes ?? 0;
            const novosLikes =
                resultado?.likes != null
                    ? resultado.likes
                    : resultado?.curtido
                        ? likesAtuais + 1
                        : Math.max(0, likesAtuais - 1);

            atualizarLikeLocal(item.id, !!resultado?.curtido, novosLikes);
        } catch (e) {
            console.error("Erro ao curtir:", e);
            alert(e.message);
        }
    }

    // adicionar ao carrinho (recebe o nome do produto do item)
    async function adicionarCarrinho(nomeProduto) {
        const nome = nomeProduto ?? pesquisa;
        if (!nome) return;

        try {
            const dados = await AsyncStorage.getItem("carrinho");
            const atual = dados ? JSON.parse(dados) : [];
            const existente = atual.find((i) => i.nome === nome);

            const novo = existente
                ? atual.map((i) =>
                    i.nome === nome ? { ...i, quantidade: i.quantidade + 1 } : i
                )
                : [...atual, { nome, quantidade: 1 }];

            await AsyncStorage.setItem("carrinho", JSON.stringify(novo));

            const atualizado = novo.find((i) => i.nome === nome);
            setQuantidadeCarrinho(atualizado?.quantidade ?? 0);
        } catch (e) {
            console.error("Erro ao adicionar ao carrinho:", e);
        }
    }

    const carregandoInicial = loading && items.length === 0;

    return (
        <View style={styles.screen}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <RegistroFeedItem
                        registro={item}
                        onCurtir={() => handleCurtir(item)}
                        onAdicionarCarrinho={adicionarCarrinho}
                        quantidadeCarrinho={
                            item.produto?.nome === pesquisa ? quantidadeCarrinho : 0
                        }
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
    center: {
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        marginTop: 16,
    },
    muted: { color: "#888", fontSize: 13, textAlign: "center", marginTop: 6 },
    erro: { color: "#c0392b", fontWeight: "700", fontSize: 16 },
    emptyEmoji: { fontSize: 48, marginBottom: 8 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: "#283618" },
});