import Svg, { Path, Rect, Circle, ClipPath, Image, Defs, G, Text as SvgText, Pattern, Use } from "react-native-svg";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { BarraNavegacao } from '../components/barraNavegação'
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { supabase } from './../../lib/supabase';

export default function Produto_pesquisado() {
    // produto pesquisado
    const { pesquisa } = useLocalSearchParams();

    const [registros, setRegistros] = useState([]);
    const [idProduto, setIdProduto] = useState("");
    const [mercado, setMercado] = useState("");

    async function buscarIdProduto() {
        const { data, error } = await supabase
            .from("produtos")
            .select("idProduto")
            .eq("nome", pesquisa)
            .single();

        if (error) {
            console.error("Erro ao buscar produto:", error);
            return;
        }

        setIdProduto(data.idProduto);
    }

    async function buscarRegistros(id) {
        const { data, error } = await supabase
            .from("registros")
            .select("idRegistro, criado_em, preço, likes, mercadoRegistro")
            .eq("produtoRegistro", id);

        if (error) {
            console.error("Erro ao buscar registros:", error);
            return;
        }

        // NOVO: busca as curtidas do usuário uma única vez
        const idU = await fnLerUsuarioLocalmente();
        let idsCurtidos = new Set();

        if (idU != null) {
            const { data: curtidas, error: erroCurtidas } = await supabase
                .from("curtidas")
                .select("fkRegistro")
                .eq("fkUsuario", idU);

            if (erroCurtidas) {
                console.error("Erro ao buscar curtidas:", erroCurtidas);
            } else {
                idsCurtidos = new Set(curtidas.map((c) => c.fkRegistro));
            }
        }

        const registrosFormatados = data.map((registro) => {
            let mercado;

            switch (registro.mercadoRegistro) {
                case 1:
                    mercado = "Assaí";
                    break;

                case 2:
                    mercado = "Extra";
                    break;

                case 3:
                    mercado = "Sonda";
                    break;

                default:
                    mercado = "Desconhecido";
            }

            return {
                ...registro,
                mercado,
                curtido: idsCurtidos.has(registro.idRegistro), // NOVO
                data: new Date(registro.criado_em).toLocaleDateString("pt-BR"),
            };
        });

        setRegistros(registrosFormatados);
    }

    async function buscarMercadoPorId() {
        const { data, error } = await supabase
            .from("mercados")
            .select(idMercado)
            .eq("nome", "mercadoRegistro")
    }

    async function adicionarCarrinho(produto) {
        try {
            const dados = await AsyncStorage.getItem("carrinho");

            const carrinhoAtual = dados
                ? JSON.parse(dados)
                : [];

            const mercados = {
                assai: Number(
                    registros.find(r => r.mercado === "Assaí")?.preco.replace(",", ".") || 0
                ),
                extra: Number(
                    registros.find(r => r.mercado === "Extra")?.preco.replace(",", ".") || 0
                ),
                sonda: Number(
                    registros.find(r => r.mercado === "Sonda")?.preco.replace(",", ".") || 0
                )
            };

            const produtoExiste = carrinhoAtual.find(
                item => item.nome === produto.nome
            );

            let novoCarrinho;

            if (produtoExiste) {

                novoCarrinho = carrinhoAtual.map(item =>
                    item.nome === produto.nome
                        ? {
                            ...item,
                            mercados,
                            quantidade: item.quantidade + 1
                        }
                        : item
                );

            } else {

                novoCarrinho = [
                    ...carrinhoAtual,
                    {
                        id: produto.id,
                        nome: produto.nome,
                        mercados,
                        quantidade: 1
                    }
                ];

            }

            await AsyncStorage.setItem(
                "carrinho",
                JSON.stringify(novoCarrinho)
            );

            setCarrinho(novoCarrinho);
            setProdutoNoCarrinho(true);
            const produtoAtualizado = novoCarrinho.find(
                item => item.nome === produto.nome
            );

            setQuantidadeCarrinho(produtoAtualizado.quantidade);

        } catch (error) {
            console.log("Erro ao adicionar ao carrinho:", error);
        }
    }


    const [carrinho, setCarrinho] = useState([]);

    async function carregarCarrinho() {
        const dados = await AsyncStorage.getItem("carrinho");

        if (dados) {
            setCarrinho(JSON.parse(dados));
        } else {
            setCarrinho([]);
        }
    }

    useEffect(() => {
        async function carregarDados() {
            await carregarCarrinho();
            await verificarCarrinho(pesquisa);
            await carregarQuantidade();

            const { data, error } = await supabase
                .from("produtos")
                .select("idProduto")
                .eq("nome", pesquisa)
                .single();

            if (error) {
                console.error("Erro ao buscar produto:", error);
                return;
            }

            setIdProduto(data.idProduto);

            await buscarRegistros(data.idProduto);
        }

        carregarDados();
        fnLerUsuarioLocalmente();
    }, [pesquisa]);

    // verificação se produto ja existe no carrinho
    const [produtoNoCarrinho, setProdutoNoCarrinho] = useState(false);
    async function verificarCarrinho(nomeProduto) {
        const dados = await AsyncStorage.getItem("carrinho");

        const carrinho = dados
            ? JSON.parse(dados)
            : [];

        const existe = carrinho.some(
            item => item.nome === nomeProduto
        );

        setProdutoNoCarrinho(existe);
    }

    // mostrar quantidade do produto no carrinho
    const [quantidadeCarrinho, setQuantidadeCarrinho] = useState(0);

    async function carregarQuantidade() {
        const dados = await AsyncStorage.getItem("carrinho");

        const carrinho = dados
            ? JSON.parse(dados)
            : [];

        const produto = carrinho.find(
            item => item.nome === pesquisa
        );

        if (produto) {
            setQuantidadeCarrinho(produto.quantidade);
        } else {
            setQuantidadeCarrinho(0);
        }
    }

    // carregamento dos dados salvos localmente
    const CHAVE_USUARIO = '@usuario';

    async function fnLerUsuarioLocalmente() {
        try {
            const json = await AsyncStorage.getItem(CHAVE_USUARIO);
            if (json == null) return null;

            const usuario = JSON.parse(json);
            return usuario.idUsuario;
        } catch (e) {
            console.error('Erro ao ler usuário:', e);
            return null;
        }
    }

    // curtidas
    async function fnCurtir(idR) {
        const idU = await fnLerUsuarioLocalmente();

        if (idU == null) {
            console.error("Usuário não encontrado no armazenamento local");
            return;
        }

        const { data, error } = await supabase
            .from("curtidas")
            .select("*")
            .eq("fkUsuario", idU)
            .eq("fkRegistro", idR)
            .maybeSingle();

        if (error) {
            console.error("Erro ao buscar curtida:", error);
            return;
        }

        const jaCurtiu = data !== null;

        if (jaCurtiu) {
            const { error } = await supabase
                .from("curtidas")
                .delete()
                .eq("fkUsuario", idU)
                .eq("fkRegistro", idR);

            if (error) {
                console.error("Erro ao remover curtida:", error);
                return;
            }
        } else {
            const { error } = await supabase
                .from("curtidas")
                .insert({ fkRegistro: idR, fkUsuario: idU });

            if (error) {
                console.error("Erro ao curtir:", error);
                return;
            }
        }

        // ATUALIZA A TELA
        setRegistros((anteriores) =>
            anteriores.map((r) =>
                r.idRegistro === idR
                    ? {
                        ...r,
                        curtido: !jaCurtiu,
                        likes: jaCurtiu ? Math.max(0, r.likes - 1) : r.likes + 1,
                    }
                    : r
            )
        );
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
                {/* figura: fundo */}
                <Path fill="#FEFAE0" d="M0 1.718 699.998 0l3.736 1521.995-699.998 1.719z" />

                {/* texto: "Localiza Aqui" */}
                <Path
                    x={175}
                    y={68}

                    fill="#001427"
                    d="m51.99 73.13-47.063.115-.164-67.219 13.453-.033.132 53.766 33.609-.083.033 13.453Zm52.906-25.677c.009 3.75-.654 7.251-1.99 10.505-1.336 3.221-3.157 6.023-5.464 8.404-2.307 2.349-5.02 4.215-8.142 5.598-3.09 1.351-6.417 2.031-9.98 2.04-3.531.008-6.86-.655-9.99-1.991-3.096-1.368-5.82-3.22-8.169-5.558-2.318-2.37-4.153-5.162-5.505-8.377-1.352-3.247-2.032-6.746-2.041-10.496-.01-3.812.654-7.345 1.99-10.598 1.335-3.253 3.156-6.055 5.463-8.404a25.774 25.774 0 0 1 8.142-5.598c3.122-1.352 6.449-2.032 9.98-2.04 3.562-.01 6.892.623 9.989 1.897 3.128 1.242 5.851 3.032 8.17 5.37 2.318 2.307 4.153 5.1 5.504 8.378 1.352 3.246 2.033 6.87 2.043 10.87Zm-12.89.031c-.006-2.062-.354-3.92-1.046-5.575-.66-1.686-1.57-3.121-2.73-4.306a11.386 11.386 0 0 0-4.084-2.756c-1.533-.652-3.174-.976-4.924-.972a12.7 12.7 0 0 0-4.967.996 11.485 11.485 0 0 0-4.024 2.776c-1.122 1.19-2.01 2.63-2.661 4.32-.652 1.657-.976 3.517-.971 5.58.005 1.937.337 3.733.998 5.388.66 1.654 1.554 3.09 2.682 4.306a13.29 13.29 0 0 0 4.038 2.896 12.201 12.201 0 0 0 4.972 1.02c1.75-.005 3.39-.337 4.92-.997a12.245 12.245 0 0 0 4.07-2.776c1.154-1.19 2.056-2.63 2.709-4.32.683-1.688 1.022-3.548 1.017-5.58Zm63.807-14.828-9.352 9.444a12.341 12.341 0 0 0-1.931-3.51 12.416 12.416 0 0 0-2.772-2.665 11.545 11.545 0 0 0-3.285-1.633 12.074 12.074 0 0 0-3.658-.553 11.75 11.75 0 0 0-4.966 1.09 12.3 12.3 0 0 0-4.024 3.056c-1.121 1.285-2.008 2.818-2.66 4.6-.652 1.784-.975 3.753-.97 5.91.004 1.75.336 3.39.996 4.919a13.148 13.148 0 0 0 2.682 4.025 12.74 12.74 0 0 0 4.038 2.709 12.7 12.7 0 0 0 4.971.972 12.596 12.596 0 0 0 3.608-.525 13.119 13.119 0 0 0 3.231-1.46 12.24 12.24 0 0 0 2.713-2.351c.81-.94 1.464-1.973 1.961-3.099l9.398 9.399a24.783 24.783 0 0 1-4.113 4.557 24.946 24.946 0 0 1-5.008 3.434 23.764 23.764 0 0 1-5.666 2.123 24.66 24.66 0 0 1-6.092.765c-3.531.009-6.861-.64-9.989-1.944-3.097-1.336-5.821-3.157-8.17-5.464-2.318-2.307-4.153-5.006-5.504-8.096-1.352-3.09-2.032-6.401-2.04-9.933-.01-3.843.653-7.439 1.989-10.786 1.335-3.347 3.156-6.258 5.463-8.732a26.229 26.229 0 0 1 8.141-5.926c3.122-1.445 6.448-2.172 9.98-2.181a23.819 23.819 0 0 1 6.142.782 23.76 23.76 0 0 1 5.771 2.33 23.393 23.393 0 0 1 5.072 3.69 22.834 22.834 0 0 1 4.044 5.053Zm54.239 40.085-3.094.008-4.986-6.878a42.195 42.195 0 0 1-3.883 3.103 30.374 30.374 0 0 1-4.259 2.495 27.28 27.28 0 0 1-4.637 1.652 18.91 18.91 0 0 1-4.779.62c-3.532.01-6.861-.576-9.989-1.756-3.097-1.18-5.82-2.892-8.169-5.136-2.318-2.276-4.153-5.052-5.505-8.33-1.352-3.278-2.033-7.011-2.043-11.198-.01-3.907.654-7.486 1.989-10.74 1.336-3.284 3.157-6.101 5.464-8.45a24.876 24.876 0 0 1 8.143-5.458c3.122-1.32 6.448-1.985 9.979-1.993a19.48 19.48 0 0 1 4.83.597c1.595.402 3.143.961 4.645 1.676a27.967 27.967 0 0 1 4.272 2.52 34.322 34.322 0 0 1 3.851 3.132l4.954-5.965 3.094-.008.123 50.11Zm-12.953-25.515a12.888 12.888 0 0 0-1.044-5.06 13.867 13.867 0 0 0-2.73-4.352 13.038 13.038 0 0 0-4.085-3.037 10.678 10.678 0 0 0-4.925-1.16c-1.75.004-3.405.305-4.966.903a11.533 11.533 0 0 0-4.025 2.635c-1.122 1.159-2.009 2.598-2.661 4.319-.653 1.689-.976 3.627-.971 5.815.006 2.187.339 4.14.999 5.857.661 1.685 1.555 3.105 2.682 4.259a11.545 11.545 0 0 0 4.038 2.615 13.87 13.87 0 0 0 4.971.878 11.04 11.04 0 0 0 4.919-1.137 14.073 14.073 0 0 0 4.071-3.057 14.626 14.626 0 0 0 2.708-4.366 13.221 13.221 0 0 0 1.019-5.112Zm35.64 25.46-12.89.031-.173-70.171 12.891-.032.172 70.172ZM257.473 8.78a7.95 7.95 0 0 1-.695 3.33 8.507 8.507 0 0 1-1.821 2.723 9.48 9.48 0 0 1-2.761 1.835 8.436 8.436 0 0 1-3.327.665 8.774 8.774 0 0 1-3.376-.648 9.659 9.659 0 0 1-2.724-1.822 9.68 9.68 0 0 1-1.835-2.714 8.434 8.434 0 0 1-.664-3.327 8.31 8.31 0 0 1 .648-3.283c.466-1.063 1.074-1.971 1.822-2.723a8.5 8.5 0 0 1 2.714-1.835 8.268 8.268 0 0 1 3.373-.711 7.945 7.945 0 0 1 3.33.695 8.367 8.367 0 0 1 2.77 1.821 7.869 7.869 0 0 1 1.835 2.715 7.844 7.844 0 0 1 .711 3.28Zm-2.046 63.849-12.891.032-.123-50.203 12.891-.032.123 50.203Zm48.984-.12-41.859.102 21.049-37.41-21.141.051-.031-12.75 41.859-.102-21.049 37.41 21.141-.051.031 12.75Zm54.984-.135-3.094.007-4.985-6.878a42.313 42.313 0 0 1-3.883 3.103 30.443 30.443 0 0 1-4.26 2.495 27.31 27.31 0 0 1-4.636 1.652c-1.562.41-3.155.617-4.78.621-3.531.009-6.861-.577-9.989-1.757-3.096-1.18-5.819-2.891-8.169-5.136-2.318-2.275-4.153-5.052-5.505-8.33-1.351-3.278-2.032-7.01-2.043-11.198-.009-3.906.654-7.486 1.99-10.74 1.335-3.284 3.157-6.1 5.463-8.45a24.887 24.887 0 0 1 8.143-5.458c3.122-1.32 6.448-1.984 9.98-1.993a19.466 19.466 0 0 1 4.829.597c1.595.403 3.143.962 4.645 1.677a27.871 27.871 0 0 1 4.272 2.52 34.322 34.322 0 0 1 3.851 3.131l4.954-5.965 3.094-.007.123 50.109ZM346.442 46.86a12.853 12.853 0 0 0-1.044-5.06 13.882 13.882 0 0 0-2.729-4.353 13.054 13.054 0 0 0-4.086-3.037 10.678 10.678 0 0 0-4.925-1.16c-1.75.005-3.405.306-4.966.903a11.533 11.533 0 0 0-4.025 2.635c-1.122 1.16-2.009 2.599-2.661 4.32-.652 1.688-.976 3.627-.97 5.814.005 2.188.338 4.14.998 5.857.661 1.686 1.555 3.105 2.683 4.259a11.54 11.54 0 0 0 4.037 2.615c1.564.59 3.221.883 4.971.879a11.04 11.04 0 0 0 4.919-1.137 14.073 14.073 0 0 0 4.071-3.057 14.626 14.626 0 0 0 2.708-4.366 13.204 13.204 0 0 0 1.019-5.112ZM44.716 165.288l-.033-13.453c-.005-1.844-.368-3.577-1.09-5.2a13.164 13.164 0 0 0-2.87-4.306c-1.223-1.216-2.662-2.165-4.32-2.849a12.723 12.723 0 0 0-5.206-1.065 13.052 13.052 0 0 0-5.247 1.091 13.282 13.282 0 0 0-4.259 2.87c-1.216 1.222-2.181 2.661-2.896 4.319-.683 1.627-1.023 3.362-1.018 5.206l.033 13.453 26.906-.066Zm13.52 26.826-13.454.033-.033-13.453-26.906.066.033 13.453-13.406.033-.1-40.312c-.008-3.719.686-7.205 2.084-10.458 1.399-3.285 3.298-6.149 5.698-8.592 2.432-2.444 5.27-4.373 8.517-5.787 3.278-1.414 6.776-2.126 10.495-2.135 3.719-.009 7.205.685 10.458 2.084 3.285 1.398 6.149 3.313 8.592 5.744 2.444 2.432 4.373 5.286 5.787 8.564 1.414 3.247 2.126 6.729 2.135 10.448l.1 40.312Zm58.499 18.982-12.891.032-.055-22.5a68.802 68.802 0 0 1-2.996 1.648 32.186 32.186 0 0 1-3.137 1.46c-1.061.409-2.154.74-3.279.993-1.093.253-2.202.38-3.327.383-3.531.009-6.86-.624-9.989-1.897a25.511 25.511 0 0 1-8.17-5.465c-2.318-2.338-4.153-5.13-5.505-8.377-1.351-3.278-2.032-6.885-2.042-10.823-.01-3.969.654-7.58 1.99-10.833 1.335-3.285 3.156-6.086 5.463-8.404a24.638 24.638 0 0 1 8.143-5.364c3.122-1.289 6.448-1.938 9.98-1.946 1.625-.004 3.219.195 4.782.597a24.99 24.99 0 0 1 4.645 1.677 25.267 25.267 0 0 1 4.272 2.473 42.314 42.314 0 0 1 3.898 3.085l4.954-5.966 3.094-.007.17 69.234Zm-13-44.64a12.87 12.87 0 0 0-1.044-5.06 13.87 13.87 0 0 0-2.73-4.353 13.047 13.047 0 0 0-4.085-3.037 10.687 10.687 0 0 0-4.925-1.16c-1.75.005-3.405.337-4.966.997a11.779 11.779 0 0 0-4.025 2.729c-1.122 1.19-2.009 2.63-2.66 4.319-.653 1.658-.977 3.533-.971 5.627.005 2.156.338 4.093.998 5.81.66 1.686 1.555 3.106 2.683 4.259a12.104 12.104 0 0 0 4.037 2.662c1.564.59 3.221.883 4.971.879a11.06 11.06 0 0 0 4.92-1.137 14.092 14.092 0 0 0 4.07-3.057 14.632 14.632 0 0 0 2.708-4.366 13.222 13.222 0 0 0 1.019-5.112Zm59.626 19.541a35.549 35.549 0 0 1-3.322 2.68 26.72 26.72 0 0 1-3.651 2.165 22.297 22.297 0 0 1-3.98 1.416 15.274 15.274 0 0 1-4.124.573c-3.094.007-6.001-.532-8.723-1.619a21.975 21.975 0 0 1-7.183-4.623c-2.036-2.027-3.652-4.476-4.846-7.348-1.164-2.903-1.75-6.152-1.759-9.746l-.068-27.749 12.75-.032.068 27.75c.005 1.688.258 3.203.762 4.545.534 1.311 1.24 2.419 2.117 3.323a8.78 8.78 0 0 0 3.052 2.055c1.189.466 2.455.697 3.799.694a7.987 7.987 0 0 0 3.701-.9 10.681 10.681 0 0 0 3.087-2.445 11.659 11.659 0 0 0 2.055-3.38c.496-1.282.743-2.596.74-3.939l-.068-27.75 12.797-.032.123 50.203-3.094.008-4.233-5.849Zm32.061-58.063a7.954 7.954 0 0 1-.695 3.33 8.495 8.495 0 0 1-1.822 2.723 9.48 9.48 0 0 1-2.761 1.835 8.433 8.433 0 0 1-3.326.664 8.775 8.775 0 0 1-3.377-.648 9.663 9.663 0 0 1-2.723-1.821 9.656 9.656 0 0 1-1.835-2.715 8.433 8.433 0 0 1-.664-3.326 8.311 8.311 0 0 1 .648-3.283c.466-1.064 1.073-1.971 1.821-2.723a8.514 8.514 0 0 1 2.714-1.835 8.28 8.28 0 0 1 3.374-.711 7.938 7.938 0 0 1 3.33.695 8.383 8.383 0 0 1 2.77 1.821 7.869 7.869 0 0 1 1.834 2.714 7.829 7.829 0 0 1 .712 3.28Zm-2.047 63.849-12.89.031-.124-50.203 12.891-.031.123 50.203Z"
                />

                {/* imagem: logo "localiza Aqui" */}
                <Image
                    x={376}
                    y={168}
                    width={104}
                    height={148}
                    href={require("../assets/img/logo-localiza-aqui.png")}
                />

                {/* figura: fundo do produto pesquisado */}
                <Rect
                    width={603}
                    height={45}
                    x={50}
                    y={398}
                    fill="#DDA15E"
                    fillOpacity={0.9}
                    rx={8}
                    shapeRendering="crispEdges"
                />

                {/* figura: borda do produto pesquisado */}
                <Rect
                    width={602}
                    height={44}
                    x={50.5}
                    y={398.5}
                    stroke="#5A2A27"
                    rx={7.5}
                    shapeRendering="crispEdges"
                />

                {/* figura: fundo da barra de navegação */}
                <Rect width={735} height={85} x={-12} y={1439} fill="#606C38" rx={20} />

                {/* icone pesquisa */}
                <Image
                    x={69}
                    y={406}
                    width={30}
                    height={38}
                    href={require("../assets/img/icone-pesquisa.png")}
                />

                {/* map dos registros */}
                {registros.map((registro, index) => (
                    <G key={registro.idRegistro} transform={`translate(0, ${index * 150})`}>

                        <SvgText
                            x={116}
                            y={505}
                            fontSize={36}
                            fill="#000"
                            fontWeight="bold"
                        >
                            {registro.mercado}
                        </SvgText>



                        {/* Curtidas */}
                        <SvgText
                            x={590}
                            y={555}
                            fontSize={32}
                            fill="red"
                        >
                            {registro.likes}
                        </SvgText>

                        {/* Data */}
                        <SvgText
                            x={440}
                            y={510}
                            fontSize={15}
                            fill="#000"
                        >
                            {registro.data}
                        </SvgText>

                        {/* fundo do preço */}
                        <Rect
                            width={411.266}
                            height={44.792}
                            x={116}
                            y={520}
                            fill="#DDA15E"
                            fillOpacity={0.9}
                            rx={8}
                        />

                        {/* Preço */}
                        <SvgText
                            x={130}
                            y={557}
                            fontSize={32}
                            fill="#000"
                            fontWeight="bold"
                        >
                            R$ {registro.preço}
                        </SvgText>


                        {/* coração */}
                        <G onPress={() => fnCurtir(registro.idRegistro)}>
                            <Image
                                x={540}
                                y={525}
                                width={39}
                                height={39}
                                href={
                                    registro.curtido
                                        ? require("../assets/img/icone-curtir-marcado.png")
                                        : require("../assets/img/icone-curtir-desmarcado.png")
                                }
                            />
                        </G>

                        <G onPress={() =>
                            router.push({
                                pathname: "/mapa",
                                params: {
                                    mercado: registro.mercado,
                                },
                            })
                        }>
                            {/* fundo de ver no mapa */}
                            <Rect width={185} height={33} x={120} y={570} fill="#DDA15E" rx={8} />

                            {/* borda de ver no mapa */}
                            <Rect width={184} height={32} x={120} y={570} stroke="#5A2A27" rx={7.5} />

                            {/* texto: "ver no mapa" */}
                            <Path
                                x={145} y={575}
                                fill="#000"
                                d="M16.242 0 9.507 15.361H6.445L0 0h3.384l4.759 11.763L12.89 0h3.351Zm4.77 4.082c3.423 0 5.134 1.747 5.134 5.242 0 .466-.032.931-.096 1.397h-7.488c0 1.59 1.168 2.384 3.502 2.384 1.14 0 2.278-.107 3.416-.322v2.256c-.995.215-2.205.322-3.63.322-4.09 0-6.134-1.923-6.134-5.768 0-3.674 1.765-5.511 5.296-5.511Zm-2.45 4.662h4.813v-.086c0-1.561-.788-2.342-2.363-2.342-1.504 0-2.32.81-2.45 2.428Zm9.722 6.617V4.082h2.202l.355 1.44c.988-.96 2.034-1.44 3.136-1.44v2.299c-1.06 0-2.008.44-2.846 1.321v7.66h-2.847Zm12.139 0V4.082h2.202l.355 1.654c1.08-1.103 2.313-1.654 3.695-1.654 2.671 0 4.007 1.39 4.007 4.168v7.111h-2.847V8.25c0-1.246-.62-1.87-1.858-1.87-.924 0-1.827.37-2.707 1.107v7.874h-2.847ZM55.687 9.68c0 2.356.914 3.534 2.74 3.534s2.739-1.178 2.739-3.534c0-2.3-.913-3.449-2.74-3.449-1.825 0-2.739 1.15-2.739 3.449Zm-2.846.043c0-3.782 1.862-5.672 5.586-5.672s5.586 1.89 5.586 5.672c0 3.774-1.862 5.66-5.586 5.66-3.71 0-5.572-1.886-5.586-5.66Zm18.154 5.64V4.081h2.202l.333 1.633c1.01-1.089 2.224-1.633 3.642-1.633 1.418 0 2.388.516 2.911 1.547 1.153-1.031 2.36-1.547 3.62-1.547 2.593 0 3.889 1.429 3.889 4.286v6.993h-2.847v-7.1c0-1.254-.566-1.88-1.697-1.88-.845 0-1.658.38-2.439 1.139v7.841h-2.846V8.293c0-1.275-.523-1.912-1.569-1.912-.83 0-1.615.38-2.352 1.139v7.841h-2.847Zm18.756-3.513c0-2.242 1.633-3.363 4.898-3.363.767 0 1.533.072 2.3.215v-.848c0-1.01-.728-1.515-2.181-1.515-1.232 0-2.6.179-4.104.537V4.619c1.504-.358 2.872-.537 4.104-.537 3.351 0 5.027 1.239 5.027 3.717v7.562H98.14l-1.01-1.01a5.611 5.611 0 0 1-3.244 1.01c-2.757 0-4.136-1.17-4.136-3.512Zm7.197-1.214a11.708 11.708 0 0 0-2.299-.215c-1.367 0-2.051.465-2.051 1.396 0 1.003.573 1.504 1.718 1.504.946 0 1.823-.293 2.632-.88v-1.805Zm8.39 1.783c.709.387 1.472.58 2.288.58 1.697 0 2.546-1.192 2.546-3.577 0-2.027-.938-3.04-2.815-3.04-.809 0-1.482.05-2.019.15v5.887Zm-2.847-7.874a23.53 23.53 0 0 1 4.748-.462c3.832 0 5.747 1.787 5.747 5.36 0 3.946-1.783 5.92-5.349 5.92-.759 0-1.526-.18-2.299-.538v4.62h-2.847v-14.9Zm12.117 7.305c0-2.242 1.633-3.363 4.899-3.363.766 0 1.532.072 2.299.215v-.848c0-1.01-.727-1.515-2.181-1.515-1.232 0-2.6.179-4.104.537V4.619c1.504-.358 2.872-.537 4.104-.537 3.352 0 5.027 1.239 5.027 3.717v7.562h-1.654l-1.01-1.01a5.61 5.61 0 0 1-3.244 1.01c-2.757 0-4.136-1.17-4.136-3.512Zm7.198-1.214a11.713 11.713 0 0 0-2.299-.215c-1.368 0-2.052.465-2.052 1.396 0 1.003.573 1.504 1.719 1.504.945 0 1.822-.293 2.632-.88v-1.805Z"
                            />
                        </G>
                    </G>
                ))}
                {/* fundo do "Adicionar carrinho" */}
                <G onPress={() => {
                    adicionarCarrinho({
                        nome: pesquisa
                    });
                }}>
                    <Rect
                        x={117}
                        y={1333}
                        width={486}
                        height={61}
                        fill="#DDA15E"
                        rx={8}

                    />

                    {/* borda do "Adicionar carrinho" */}
                    <Rect x={117} y={1333} width={486} height={61} stroke="#5A2A27" rx={7.5} />

                    {/* texto: adicionar ao carrinho */}
                    <Path
                        x={183} y={1358}
                        fill="#000"
                        d="M2.922 15.361H0L6.52 0h3.062l6.66 15.361h-3.061l-1.751-4.19H6.327l.978-2.47h3.093L7.981 2.933 2.921 15.36Zm22.075-8.336c-.587-.386-1.325-.58-2.213-.58-1.769 0-2.653.992-2.653 2.976 0 2.356.92 3.534 2.76 3.534.745 0 1.447-.104 2.106-.311V7.025Zm2.847 7.66c-1.726.45-3.413.676-5.06.676-3.645 0-5.468-1.955-5.468-5.865 0-3.61 1.784-5.414 5.35-5.414.76 0 1.536.18 2.331.537V0h2.847v14.685ZM33.376 0v2.256h-2.847V0h2.847Zm0 4.082v11.28h-2.847V4.081h2.847Zm11.022 10.957c-.931.215-1.898.322-2.9.322-4.011 0-6.017-1.951-6.017-5.854 0-3.617 2.006-5.425 6.016-5.425 1.003 0 1.97.107 2.9.322V6.66a11.939 11.939 0 0 0-2.685-.322c-2.256 0-3.384 1.056-3.384 3.169 0 2.399 1.128 3.598 3.384 3.598.86 0 1.755-.107 2.685-.322v2.256ZM49.123 0v2.256h-2.847V0h2.847Zm0 4.082v11.28h-2.847V4.081h2.847Zm5.006 5.597c0 2.356.913 3.534 2.74 3.534 1.825 0 2.738-1.178 2.738-3.534 0-2.3-.913-3.449-2.739-3.449-1.826 0-2.74 1.15-2.74 3.449Zm-2.847.043c0-3.782 1.862-5.672 5.586-5.672s5.586 1.89 5.586 5.672c0 3.774-1.862 5.66-5.586 5.66-3.71 0-5.572-1.886-5.586-5.66Zm13.32 5.64V4.081h2.203l.354 1.654c1.082-1.103 2.313-1.654 3.696-1.654 2.67 0 4.006 1.39 4.006 4.168v7.111h-2.846V8.25c0-1.246-.62-1.87-1.859-1.87-.924 0-1.826.37-2.707 1.107v7.874h-2.847Zm12.419-3.513c0-2.242 1.632-3.363 4.898-3.363.766 0 1.532.072 2.299.215v-.848c0-1.01-.727-1.515-2.18-1.515-1.233 0-2.6.179-4.104.537V4.619c1.504-.358 2.871-.537 4.103-.537 3.352 0 5.027 1.239 5.027 3.717v7.562h-1.654l-1.01-1.01a5.611 5.611 0 0 1-3.244 1.01c-2.757 0-4.135-1.17-4.135-3.512Zm7.197-1.214a11.708 11.708 0 0 0-2.3-.215c-1.367 0-2.05.465-2.05 1.396 0 1.003.572 1.504 1.718 1.504.945 0 1.822-.293 2.632-.88v-1.805Zm5.543 4.726V4.082h2.202l.354 1.44c.989-.96 2.034-1.44 3.137-1.44v2.299c-1.06 0-2.009.44-2.847 1.321v7.66h-2.846Zm11.601-3.512c0-2.242 1.633-3.363 4.899-3.363.766 0 1.532.072 2.299.215v-.848c0-1.01-.727-1.515-2.181-1.515-1.232 0-2.6.179-4.104.537V4.619c1.504-.358 2.872-.537 4.104-.537 3.351 0 5.027 1.239 5.027 3.717v7.562h-1.654l-1.01-1.01a5.61 5.61 0 0 1-3.244 1.01c-2.757 0-4.136-1.17-4.136-3.512Zm7.198-1.214a11.72 11.72 0 0 0-2.299-.215c-1.368 0-2.052.465-2.052 1.396 0 1.003.573 1.504 1.719 1.504.945 0 1.822-.293 2.632-.88v-1.805Zm7.852-.956c0 2.356.913 3.534 2.739 3.534 1.827 0 2.74-1.178 2.74-3.534 0-2.3-.913-3.449-2.74-3.449-1.826 0-2.739 1.15-2.739 3.449Zm-2.847.043c0-3.782 1.862-5.672 5.586-5.672s5.586 1.89 5.586 5.672c0 3.774-1.862 5.66-5.586 5.66-3.709 0-5.571-1.886-5.586-5.66Zm26.48 5.317c-.931.215-1.898.322-2.9.322-4.011 0-6.016-1.951-6.016-5.854 0-3.617 2.005-5.425 6.016-5.425 1.002 0 1.969.107 2.9.322V6.66a11.938 11.938 0 0 0-2.686-.322c-2.256 0-3.383 1.056-3.383 3.169 0 2.399 1.127 3.598 3.383 3.598.86 0 1.755-.107 2.686-.322v2.256Zm1.343-3.19c0-2.242 1.632-3.363 4.898-3.363.766 0 1.533.072 2.299.215v-.848c0-1.01-.727-1.515-2.181-1.515-1.231 0-2.599.179-4.103.537V4.619c1.504-.358 2.872-.537 4.103-.537 3.352 0 5.028 1.239 5.028 3.717v7.562h-1.655l-1.009-1.01a5.615 5.615 0 0 1-3.245 1.01c-2.757 0-4.135-1.17-4.135-3.512Zm7.197-1.214a11.705 11.705 0 0 0-2.299-.215c-1.368 0-2.052.465-2.052 1.396 0 1.003.573 1.504 1.719 1.504.945 0 1.823-.293 2.632-.88v-1.805Zm5.543 4.726V4.082h2.202l.355 1.44c.988-.96 2.033-1.44 3.136-1.44v2.299c-1.06 0-2.009.44-2.846 1.321v7.66h-2.847Zm7.305 0V4.082h2.202l.354 1.44c.989-.96 2.034-1.44 3.137-1.44v2.299c-1.06 0-2.009.44-2.847 1.321v7.66h-2.846ZM171.585 0v2.256h-2.847V0h2.847Zm0 4.082v11.28h-2.847V4.081h2.847Zm2.696 11.28V4.081h2.202l.355 1.654c1.081-1.103 2.313-1.654 3.695-1.654 2.671 0 4.007 1.39 4.007 4.168v7.111h-2.847V8.25c0-1.246-.619-1.87-1.858-1.87-.924 0-1.826.37-2.707 1.107v7.874h-2.847Zm12.955 0V0h2.847v5.521c.888-.96 2.023-1.439 3.405-1.439 2.672 0 4.007 1.39 4.007 4.168v7.111h-2.847V8.25c0-1.246-.619-1.87-1.858-1.87-.924 0-1.826.37-2.707 1.107v7.874h-2.847Zm15.265-5.683c0 2.356.913 3.534 2.739 3.534 1.826 0 2.739-1.178 2.739-3.534 0-2.3-.913-3.449-2.739-3.449-1.826 0-2.739 1.15-2.739 3.449Zm-2.847.043c0-3.782 1.862-5.672 5.586-5.672s5.586 1.89 5.586 5.672c0 3.774-1.862 5.66-5.586 5.66-3.709 0-5.571-1.886-5.586-5.66Z"
                    />
                    {/* icone carrinho 2 */}
                    <Image
                        x={117}
                        y={1328}
                        width={66}
                        height={66}
                        href={require("../assets/img/icone-carrinho-2.png")}
                    />
                </G>
            </Svg>

            <BarraNavegacao />
            <TextInput
                style={{
                    position: "absolute",
                    top: 253,
                    left: 60,
                }}
            >{pesquisa}</TextInput>
            {/* quantidade desse produto no carrinho */}
            <Text style={{
                position: 'absolute',
                top: 800,
                left: 235
            }}>
                ( {quantidadeCarrinho} )
            </Text>
        </View>
    );
}