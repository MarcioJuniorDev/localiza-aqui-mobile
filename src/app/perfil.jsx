import { Alert, Text, View } from "react-native";
import Svg, {
    ClipPath,
    Defs,
    Ellipse,
    G,
    Path,
    Rect,
    Image as SvgImage,
    Text as SvgText,
} from "react-native-svg";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BarraNavegacao } from "../components/barraNavegação";
import { buscarConquistasUsuario } from "../services/conquistas";
import { buscarReputacaoUsuario } from "../services/reputacao";

export default function Home() {
    const [localizacao, setLocalizacao] = useState("");
    const [nivel, setNivel] = useState("Bronze");
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [conquistas, setConquistas] = useState([]);
    const [endereco, setEndereco] = useState(null);
    const [fotoUrl, setFotoUrl] = useState(null);

    useEffect(() => {
        let ativo = true;

        // 1) Usuário + reputação + conquistas (uma única leitura)
        async function carregarUsuarioEreputacao() { /* ... */ }

        // (mantenha o bloco abaixo, que é o corrigido)
        async function carregarUsuarioEReputacao() {
            try {
                const usuarioSalvo = await AsyncStorage.getItem(CHAVE_USUARIO);
                if (!usuarioSalvo) return;

                const usuario = JSON.parse(usuarioSalvo);
                if (!ativo) return;

                setNome(usuario.nome ?? '');
                setEmail(usuario.email ?? '');
                setFotoUrl(usuario.foto_url ?? usuario.fotoUrl ?? null);

                if (!usuario?.idUsuario) return;

                const reputacao = await buscarReputacaoUsuario(usuario.idUsuario);
                if (!ativo) return;
                setNivel(reputacao.rank);

                const listaConquistas = await buscarConquistasUsuario(usuario.idUsuario);
                if (!ativo) return;
                setConquistas(listaConquistas);

                console.log("Nível: " + reputacao.rank + " conquistas: " + listaConquistas);
            } catch (error) {
                console.error("Erro ao carregar usuário/reputação:", error);
            }
        }

        // 2) Localização + endereço (string!)
        async function carregarLocalizacaoEEndereco() {
            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") return;

                const posicao = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                if (!ativo) return;

                const [end] = await Location.reverseGeocodeAsync({
                    latitude: posicao.coords.latitude,
                    longitude: posicao.coords.longitude,
                });
                if (!ativo) return;

                if (end) {
                    const via = [end.street, end.streetNumber]
                        .filter(Boolean).join(', ');
                    const bairro = end.district ?? end.subregion ?? '';
                    const cidadeUf = [end.city, end.region]
                        .filter(Boolean).join(' - ');
                    setEndereco(
                        [via, bairro, cidadeUf].filter(Boolean).join(' • ')
                    );
                } else {
                    setEndereco('Endereço indisponível');
                }
            } catch (error) {
                console.error("Erro ao carregar localização/endereço:", error);
                if (ativo) setEndereco('Erro ao obter endereço');
            }
        }

        carregarUsuarioEReputacao();
        carregarLocalizacaoEEndereco();

        return () => { ativo = false; };
    }, []);

    // carregamento dos dados salvos localmente
    const CHAVE_USUARIO = '@usuario';

    async function fnLerNomeUsuarioLocalmente() {
        try {
            const json = await AsyncStorage.getItem(CHAVE_USUARIO);
            if (json == null) return null;

            const usuario = JSON.parse(json);
            setNome(usuario.nome);
        } catch (e) {
            console.error('Erro ao ler usuário:', e);
            return null;
        }
    }

    async function fnLerEmailUsuarioLocalmente() {
        try {
            const json = await AsyncStorage.getItem(CHAVE_USUARIO);
            if (json == null) return null;

            const usuario = JSON.parse(json);
            setEmail(usuario.email);
        } catch (e) {
            console.error('Erro ao ler usuário:', e);
            return null;
        }
    }

    return (
        <View style={{ flex: 1 }}>
            <Svg
                xmlns="http://www.w3.org/2000/svg"
                width='100%'
                height='100%'
                viewBox="0 0 704 1524"
                fill="none"
            >

                {/* define o recorte circular da foto */}
                <Defs>
                    <ClipPath id="clipFoto">
                        <Ellipse cx={130.5} cy={221} rx={98.5} ry={100} />
                    </ClipPath>
                </Defs>
                {/* bege do fundo */}
                <Path
                    fill="#FEFAE0"
                    d="M0 1.718 699.998 0l3.736 1521.995-699.998 1.719z"
                />

                {/* campo de "Localização" */}
                <G filter="url(#b)">
                    <Rect
                        width={410.27}
                        height={43.79}
                        x={150}
                        y={1250}
                        fill="#DDA15E"
                        fillOpacity={0.9}
                        stroke="#5A2A27"
                        rx={7.5}
                        shapeRendering="crispEdges"
                    />
                </G>

                {/* gradiente de cor em cima */}
                <Path fill="url(#a)" stroke="#000" d="M.5-1.5h699v244H.5z" />
                <Defs>
                    <LinearGradient
                        id="a"
                        x1={350}
                        x2={350}
                        y1={-2}
                        y2={243}
                        gradientUnits="userSpaceOnUse"
                    >
                        <Stop stopColor="#283618" />
                        <Stop offset={1} stopColor="#749C45" />
                    </LinearGradient>
                </Defs>

                {/* espaço da foto — fundo laranja (placeholder) */}
                <Ellipse cx={130.5} cy={221} fill="#DDA15E" rx={98.5} ry={100} />

                
                {/* foto do usuário (se existir) — recortada em círculo */}
                {fotoUrl && (
                    <SvgImage
                        x={130.5 - 98.5}         // 32
                        y={221 - 100}             // 121
                        width={197}               // 2 * 98.5
                        height={200}              // 2 * 100
                        href={{ uri: fotoUrl }}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath="url(#clipFoto)"
                    />
                )}

                {/* placeholder: inicial do nome, quando não há foto */}
                {!fotoUrl && (
                    <SvgText
                        x={130.5}
                        y={221}
                        fontSize={80}
                        fill="#5A2A27"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                    >
                        {(nome?.[0] ?? '?').toUpperCase()}
                    </SvgText>
                )}

                {/* fundo da posição do ranking */}
                <Rect
                    width={265}
                    height={25}
                    x={224.5}
                    y={626.5}
                    fill="#DDA15E"
                    stroke="#5A2A27"
                    rx={12.5}
                />

                {/* fundo verde da barra de XP */}
                <Rect
                    width={480}
                    height={40}
                    x={117.5}
                    y={721.5}
                    fill="#606C38"
                    stroke="#5A2A27"
                    rx={19.5}
                />

                {/* fundo do nível */}
                <Rect
                    width={120}
                    height={40}
                    x={117.5}
                    y={721.5}
                    fill="#DDA15E"
                    stroke="#5A2A27"
                    rx={19.5}
                />

                {/* fundo verde das conquistas */}
                <Rect width={591} height={275} x={74} y={883} fill="#606C38" rx={20} />

                {/* fundo laranja nas conquistas */}
                <Rect
                    width={589}
                    height={280}
                    x={65}
                    y={866}
                    fill="#DDA15E"
                    rx={20}
                />

                {/* fundo verde do título "Conquistas" */}
                <Path
                    fill="#606C38"
                    d="M65 886c0-11.046 8.954-20 20-20h549c11.046 0 20 8.954 20 20v44H65v-44Z"
                />

                {/* texto: "Conquistas" */}
                <Path
                    fill="#fff"
                    d="M261.234 908.594c-2.89 1.094-6.172 1.64-9.843 1.64-12.032 0-18.047-5.82-18.047-17.461 0-11.015 6.015-16.523 18.047-16.523 3.671 0 6.953.547 9.843 1.641v5.625c-2.89-1.25-6.015-1.875-9.375-1.875-8.047 0-12.07 3.711-12.07 11.132 0 8.047 4.023 12.071 12.07 12.071 3.36 0 6.485-.625 9.375-1.875v5.625Zm10.313-10.992c0 5.14 1.992 7.711 5.976 7.711 3.985 0 5.977-2.571 5.977-7.711 0-5.016-1.992-7.524-5.977-7.524-3.984 0-5.976 2.508-5.976 7.524Zm-6.211.093c0-8.25 4.062-12.375 12.187-12.375s12.188 4.125 12.188 12.375c0 8.235-4.063 12.352-12.188 12.352-8.093 0-12.156-4.117-12.187-12.352ZM294.398 910v-24.609h4.805l.774 3.609c2.359-2.406 5.046-3.609 8.062-3.609 5.828 0 8.742 3.031 8.742 9.093V910h-6.211v-15.516c0-2.718-1.351-4.078-4.054-4.078-2.016 0-3.985.805-5.907 2.414V910h-6.211Zm44.016-19.031c-1.484-.375-2.852-.563-4.102-.563-4.453 0-6.679 2.367-6.679 7.102 0 4.89 1.929 7.336 5.789 7.336 1.937 0 3.601-.422 4.992-1.266v-12.609Zm6.211 27.937h-6.211v-10.078c-1.687.781-3.594 1.172-5.719 1.172-7.468 0-11.203-4.148-11.203-12.445 0-8.11 4.258-12.164 12.774-12.164 3.171 0 6.625.336 10.359 1.007v32.508Zm28.031-33.515V910h-4.851l-.75-3.141c-2.828 2.094-5.828 3.141-9 3.141-5.032 0-7.547-2.977-7.547-8.93v-15.679h6.211v15.515c0 2.719 1.187 4.078 3.562 4.078 2.016 0 4.071-.804 6.164-2.414v-17.179h6.211Zm12.094-8.907v4.922h-6.211v-4.922h6.211Zm0 8.907V910h-6.211v-24.609h6.211Zm5.883 23.437v-5.156c2.734 1.094 5.89 1.641 9.469 1.641 2.671 0 4.007-.86 4.007-2.579 0-1.64-.898-2.461-2.695-2.461h-4.453c-5 0-7.5-2.46-7.5-7.382 0-5.157 3.648-7.735 10.945-7.735 3.094 0 6.008.469 8.742 1.407v5.156c-2.734-1.094-5.703-1.641-8.906-1.641-3.359 0-5.039.86-5.039 2.578 0 1.641.977 2.461 2.93 2.461h3.984c5.469 0 8.203 2.461 8.203 7.383 0 5.156-3.484 7.734-10.453 7.734-3.422 0-6.5-.468-9.234-1.406Zm23.695-27.422h4.594l.937 3.985h6.188v4.922h-5.508v11.32c0 2.297.992 3.445 2.977 3.445h2.531V910h-5.531c-4.125 0-6.188-2.211-6.188-6.633v-21.961Zm14.789 20.93c0-4.891 3.563-7.336 10.688-7.336 1.672 0 3.343.156 5.015.469v-1.852c0-2.203-1.586-3.304-4.758-3.304-2.687 0-5.671.39-8.953 1.171v-4.921c3.282-.782 6.266-1.172 8.953-1.172 7.313 0 10.969 2.703 10.969 8.109V910h-3.609l-2.203-2.203c-2.141 1.469-4.5 2.203-7.078 2.203-6.016 0-9.024-2.555-9.024-7.664Zm15.703-2.648c-1.562-.313-3.234-.469-5.015-.469-2.985 0-4.477 1.015-4.477 3.047 0 2.187 1.25 3.281 3.75 3.281 2.063 0 3.977-.641 5.742-1.922v-3.937Zm12.094 9.14v-5.156c2.734 1.094 5.891 1.641 9.469 1.641 2.672 0 4.008-.86 4.008-2.579 0-1.64-.899-2.461-2.696-2.461h-4.453c-5 0-7.5-2.46-7.5-7.382 0-5.157 3.649-7.735 10.945-7.735 3.094 0 6.008.469 8.743 1.407v5.156c-2.735-1.094-5.703-1.641-8.907-1.641-3.359 0-5.039.86-5.039 2.578 0 1.641.977 2.461 2.93 2.461h3.984c5.469 0 8.204 2.461 8.204 7.383 0 5.156-3.485 7.734-10.454 7.734-3.421 0-6.5-.468-9.234-1.406Z"
                />

                {/* molde espaço para conquistas */}
                <Rect width={95} height={80} x={117} y={985} fill="#606C38" rx={20} />
                <Rect width={75} height={63} x={127} y={993} fill="#D4A373" rx={20} />

                {/* trofeu */}
                <Rect
                    width={54}
                    height={76}
                    x={331}
                    y={466}
                    fill="#A44200"
                    fillOpacity={0.8}
                    stroke="#5A2A27"
                    rx={9.5}
                />

                <SvgImage
                    x={233}
                    y={440}
                    width={247}
                    height={204}
                    href={require("../assets/img/imagem-trofeu.png")}
                />

                {/* imagem config */}
                <Image
                    x={635}
                    y={245}
                    width={60}
                    height={60}
                    href={require("../assets/img/icone-config.png")}
                />|
            </Svg>

            {/* localização */}
            <Text style={{ position: 'absolute', top: '85%', left: '20%', right: '5%', fontSize: 16 }}>
                {endereco}
            </Text>

            <Text style={{ position: 'absolute', top: '81.2%', left: '38%', fontSize: 20 }}>Localização</Text>

            {/* nome de usuário */}
            <Text style={{ position: 'absolute', top: '22%', left: '7%', fontSize: 20 }}>{nome}</Text>

            {/* email do usuário */}
            <Text style={{ position: 'absolute', top: '24.5%', left: '7%', fontSize: 14 }}>{email}</Text>

            {/* barra de XP dinâmica */}

            {/* nível */}
            <Text style={{ position: 'absolute', top: '47.5%', left: '19.5%', fontSize: 16 }}>{nivel}</Text>

            {/* XP */}

            {/* sua posição no ranking */}

            {/* conquistas do usuário */}

            <Pressable
                onPress={() => router.push("/editar-perfil")}
                style={{
                    position: 'absolute',
                    top: '17.3%',
                    left: '91%',
                    width: 30,
                    height: 30,
                }}
            />
            <BarraNavegacao />
        </View >
    );
}