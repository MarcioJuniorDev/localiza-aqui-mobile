// components/RegistroFeedItem.js
import React, { memo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const IMG_CURTIDO = require("../assets/img/icone-curtir-marcado.png");
const IMG_NAO_CURTIDO = require("../assets/img/icone-curtir-desmarcado.png");
const IMG_CARRINHO = require("../assets/img/icone-carrinho-2.png");

function formatarPreco(valor) {
  const n =
    typeof valor === "number"
      ? valor
      : Number(String(valor ?? "0").replace(",", ".")) || 0;
  return "R$ " + n.toFixed(2).replace(".", ",");
}

function RegistroFeedItemBase({
  registro,
  onCurtir,
  onAdicionarCarrinho,
  quantidadeCarrinho = 0,
}) {
  const {
    preço,
    data,
    likes = 0,
    curtido = false,
    mercado,
    produto,
    usuario,
  } = registro ?? {};

  return (
    <View style={styles.card}>
      {/* cabeçalho: autor */}
      <View style={styles.header}>
        {usuario?.foto_url ? (
          <Image source={{ uri: usuario.foto_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { opacity: 0.3 }]} />
        )}
        <Text style={styles.autor} numberOfLines={1}>
          {usuario?.nome ?? "—"}
        </Text>
      </View>

      {/* mercado + data */}
      <View style={styles.linhaInfo}>
        <Text style={styles.mercado} numberOfLines={1}>
          {mercado?.nome ?? "Desconhecido"}
        </Text>
        <Text style={styles.data}>{data ?? ""}</Text>
      </View>

      {/* preço + coração + carrinho */}
      <View style={styles.linhaPreco}>
        <View style={styles.precoBox}>
          <Text style={styles.preco}>{formatarPreco(preço)}</Text>
        </View>

        <View style={styles.acoes}>
          {/* coração: usa `registro.curtido` (não likes > 0) */}
          <TouchableOpacity
            onPress={onCurtir}
            activeOpacity={0.7}
            style={styles.likeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={curtido ? IMG_CURTIDO : IMG_NAO_CURTIDO}
              style={styles.likeIcon}
            />
            <Text style={styles.likeCount}>{likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onAdicionarCarrinho?.(produto?.nome)}
            activeOpacity={0.7}
            style={styles.cartBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image source={IMG_CARRINHO} style={styles.cartIcon} />
            {quantidadeCarrinho > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{quantidadeCarrinho}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ⬇️ 3ª regra: incluir curtido e likes no comparator do memo.
export const RegistroFeedItem = memo(
  RegistroFeedItemBase,
  (prev, next) =>
    prev.registro.id === next.registro.id &&
    prev.registro.curtido === next.registro.curtido &&
    prev.registro.likes === next.registro.likes &&
    prev.quantidadeCarrinho === next.quantidadeCarrinho &&
    prev.onCurtir === next.onCurtir &&
    prev.onAdicionarCarrinho === next.onAdicionarCarrinho
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FEFAE0",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5A2A27",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  autor: { fontSize: 13, fontWeight: "700", color: "#283618", flex: 1 },
  linhaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 10,
    gap: 8,
  },
  mercado: { fontSize: 18, fontWeight: "800", color: "#001427", flexShrink: 1 },
  data: { fontSize: 12, color: "#666" },
  linhaPreco: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  precoBox: {
    backgroundColor: "#DDA15E",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flex: 1,
    marginRight: 12,
  },
  preco: { fontSize: 22, fontWeight: "800", color: "#000" },
  acoes: { flexDirection: "row", alignItems: "center", gap: 12 },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeIcon: { width: 28, height: 28 },
  likeCount: { fontSize: 16, fontWeight: "700", color: "#5A2A27" },
  cartBtn: { padding: 2 },
  cartIcon: { width: 30, height: 30, right: '40%'},
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#c0392b",
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});