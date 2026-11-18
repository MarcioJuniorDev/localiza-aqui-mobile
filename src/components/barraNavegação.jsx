import { router } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function BarraNavegacao() {
  // descobre a área dos botões virtuais
  const insets = useSafeAreaInsets();

  return (
    <>
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 20,
          right: 20,
          // adiciona espaço em baixo do componente igual ao tamanho dos botões virtuais
          paddingBottom: insets.bottom,
          height: 70,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Pressable onPress={() => router.push("/home")}>
          <Image
            source={require("../assets/img/icone-home.png")}
            style={{
              width: 40,
              height: 40,
              resizeMode: "contain"
            }}
          />
        </Pressable>

        <Pressable onPress={() => router.push("/pesquisa")}>
          <Image
            source={require("../assets/img/icone-pesquisa.png")}
            style={{
              width: 25,
              height: 25,
              resizeMode: "contain"
            }}
          />
        </Pressable>

        <Pressable onPress={() => router.push("/mercados")}>
          <Image
            source={require("../assets/img/icone-mercado.png")}
            style={{
              width: 30,
              height: 30,
              resizeMode: "contain"
            }}
          />
        </Pressable>

        <Pressable onPress={() => router.push("/adicionar")}>
          <Image
            source={require("../assets/img/icone-adicionar.png")}
            style={{
              width: 40,
              height: 40,
              resizeMode: "contain"
            }}
          />
        </Pressable>

        <Pressable onPress={() => router.push("/favoritos")}>
          <Image
            source={require("../assets/img/icone-favoritos.png")}
            style={{
              width: 25,
              height: 25,
              resizeMode: "contain"
            }}
          />
        </Pressable>

        <Pressable onPress={() => router.push("/perfil")}>
          <Image
            source={require("../assets/img/icone-perfil.png")}
            style={{
              width: 40,
              height: 40,
              resizeMode: "contain"
            }}
          />
        </Pressable>
      </View>
    </>
  );
}