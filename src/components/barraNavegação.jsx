import { router } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function BarraNavegacao() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,           // fundo ocupa a largura toda
        right: 0,
        backgroundColor: "#606C38", // fundo aqui, sem SVG
        paddingBottom: insets.bottom, // respeita botões virtuais
        paddingTop: 15,
        paddingHorizontal: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Pressable onPress={() => router.push("/home")}>
        <Image
          source={require("../assets/img/icone-home.png")}
          style={{ width: 40, height: 40, resizeMode: "contain" }}
        />
      </Pressable>

      <Pressable onPress={() => router.push("/pesquisa")}>
        <Image
          source={require("../assets/img/icone-pesquisa.png")}
          style={{ width: 25, height: 25, resizeMode: "contain" }}
        />
      </Pressable>

      <Pressable onPress={() => router.push("/mercados")}>
        <Image
          source={require("../assets/img/icone-mercado.png")}
          style={{ width: 30, height: 30, resizeMode: "contain" }}
        />
      </Pressable>

      <Pressable onPress={() => router.push("/adicionar")}>
        <Image
          source={require("../assets/img/icone-adicionar.png")}
          style={{ width: 40, height: 40, resizeMode: "contain" }}
        />
      </Pressable>

      <Pressable onPress={() => router.push("/favoritos")}>
        <Image
          source={require("../assets/img/icone-favoritos.png")}
          style={{ width: 25, height: 25, resizeMode: "contain" }}
        />
      </Pressable>

      <Pressable onPress={() => router.push("/perfil")}>
        <Image
          source={require("../assets/img/icone-perfil.png")}
          style={{ width: 40, height: 40, resizeMode: "contain" }}
        />
      </Pressable>
    </View>
  );
}