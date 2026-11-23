import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

function formatarPreco(valor) {
    const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
    if (Number.isNaN(n)) return "R$ --";
    return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function formatarData(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("pt-BR");
}

function iniciais(nome) {
    if (!nome || !nome.trim()) return "UD";
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

export function RegistroFeedItem({
    registro,
    onCurtir,
    onAdicionarCarrinho,
    quantidadeCarrinho = 0,
}) {
    const noCarrinho = quantidadeCarrinho > 0;
    const usuario = registro.usuario ?? {};
    const temNome = !!usuario.nome?.trim();
    const temFoto = !!usuario.foto_url;

    return (
        <View style={styles.card}>
            {/* ===== Autor: avatar + nome + data ===== */}
            <View style={styles.linhaAutor}>
                {temFoto ? (
                    <Image source={{ uri: usuario.foto_url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarText}>{iniciais(usuario.nome)}</Text>
                    </View>
                )}

                <View style={{ flex: 1 }}>
                    <Text style={styles.autorNome} numberOfLines={1}>
                        {usuario.nome?.trim() || "Usuário deletado"}
                    </Text>
                    <Text style={styles.autorData}>{formatarData(registro.criado_em)}</Text>
                </View>
            </View>

            {/* ===== Mercado ===== */}
            <Text style={styles.mercado} numberOfLines={1}>
                {registro.mercado?.nome}
            </Text>

            {/* ===== Preço | coração | curtidas ===== */}
            <View style={styles.linhaPreco}>
                <View style={styles.precoBox}>
                    <Text style={styles.preco}>{formatarPreco(registro.preço)}</Text>
                </View>

                <Pressable onPress={onCurtir} hitSlop={10} style={styles.likeArea}>
                    <Image
                        source={
                            registro.curtido
                                ? require("../assets/img/icone-curtir-marcado.png")
                                : require("../assets/img/icone-curtir-desmarcado.png")
                        }
                        style={styles.coracao}
                    />
                </Pressable>

                <Text style={styles.likes}>{registro.likes ?? 0}</Text>
            </View>

            {/* ===== Botões ===== */}
            <View style={styles.linhaBotoes}>
                <Pressable
                    onPress={() =>
                        router.push({
                            pathname: "/mapa",
                            params: { mercado: registro.mercado?.nome },
                        })
                    }
                    style={({ pressed }) => [styles.mapaBtn, pressed && { opacity: 0.7 }]}
                >
                    <Text style={styles.mapaBtnText}>ver no mapa</Text>
                </Pressable>

                <Pressable
                    onPress={() => onAdicionarCarrinho?.(registro.produto?.nome)}
                    style={({ pressed }) => [
                        styles.addBtn,
                        noCarrinho && styles.addBtnActive,
                        pressed && { opacity: 0.8 },
                    ]}
                >
                    <Text style={[styles.addBtnText, noCarrinho && styles.addBtnTextActive]}>
                        {noCarrinho ? `✓ No carrinho (${quantidadeCarrinho})` : "🛒 Adicionar"}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FEFAE0",
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#EAD9B0",
    },

    // autor
    linhaAutor: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#DDA15E",
    },
    avatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#5A2A27",
        fontWeight: "800",
        fontSize: 13,
    },
    autorNome: {
        fontSize: 14,
        fontWeight: "700",
        color: "#283618",
    },
    autorData: {
        fontSize: 11,
        color: "#888",
        marginTop: 1,
    },

    // mercado
    mercado: {
        fontSize: 20,
        fontWeight: "800",
        color: "#000",
        marginBottom: 6,
    },

    // preço
    linhaPreco: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    precoBox: {
        flex: 1,
        backgroundColor: "#DDA15E",
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    preco: { fontSize: 22, fontWeight: "800", color: "#000" },
    likeArea: { marginLeft: 8, padding: 4 },
    coracao: { width: 32, height: 32 },
    likes: {
        fontSize: 20,
        fontWeight: "800",
        color: "red",
        marginLeft: 6,
        minWidth: 28,
        textAlign: "right",
    },

    // botões
    linhaBotoes: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    mapaBtn: {
        flex: 1,
        backgroundColor: "#DDA15E",
        borderWidth: 1,
        borderColor: "#5A2A27",
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: "center",
    },
    mapaBtnText: { fontSize: 12, fontWeight: "600", color: "#000" },
    addBtn: {
        flex: 1,
        backgroundColor: "#DDA15E",
        borderWidth: 1,
        borderColor: "#5A2A27",
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: "center",
    },
    addBtnActive: {
        backgroundColor: "#606C38",
        borderColor: "#283618",
    },
    addBtnText: { fontSize: 12, fontWeight: "700", color: "#000" },
    addBtnTextActive: { color: "#FEFAE0" },
});