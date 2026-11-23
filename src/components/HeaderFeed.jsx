import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export function HeaderFeed({
    pesquisa,
    imagemAtual,
    imagemIndex = 0,
    totalImagens = 4,
}) {
    return (
        <View>
            <LinearGradient
                colors={["#283618", "#749C45"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.greenArea}
            >
                <Text style={styles.titulo}>Localiza Aqui</Text>

                <View style={styles.imagemWrap}>
                    <Image source={imagemAtual} style={styles.imagem} resizeMode="cover" />
                </View>

                <View style={styles.dots}>
                    {Array.from({ length: totalImagens }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                { backgroundColor: i === imagemIndex ? "#000" : "#D9D9D9" },
                            ]}
                        />
                    ))}
                </View>
            </LinearGradient>

            <View style={styles.listra} />

            {pesquisa ? (
                <View style={styles.cardProduto}>
                    <Text style={styles.produto} numberOfLines={1}>
                        {pesquisa}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    greenArea: {
        paddingTop: 24,
        paddingBottom: 28,
        paddingHorizontal: 16,
    },
    titulo: {
        color: "#FEFAE0",
        fontSize: 26,
        fontWeight: "900",
        textAlign: "center",
        marginBottom: 16,
    },
    imagemWrap: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#000",
        overflow: "hidden",
        height: 180,
    },
    imagem: { width: "100%", height: "100%" },
    dots: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
        marginTop: 14,
    },
    dot: { width: 14, height: 14, borderRadius: 7 },
    listra: {
        height: 24,
        backgroundColor: "#DDA15E",
        borderTopWidth: 1,
        borderTopColor: "#5A2A27",
        borderBottomWidth: 1,
        borderBottomColor: "#5A2A27",
    },
    cardProduto: {
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#EAD9B0",
    },
    produto: {
        fontSize: 20,
        fontWeight: "800",
        color: "#283618",
    },
});