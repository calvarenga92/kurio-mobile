import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { formatarEth } from '@calvarenga92/kurio-regras';
import { consultaNfts } from '@/api/consultas';
import { Carregando, Falha, ImagemNft, Texto } from '@/ui/base';
import { cores, espaco } from '@/ui/tema';

export default function Catalogo() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const colunas = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const { data, isPending, isError, refetch } = useQuery(consultaNfts);

  if (isPending) return <Carregando />;
  if (isError) return <Falha mensagem="Não foi possível carregar o catálogo." aoTentar={refetch} />;

  return (
    <FlatList
      key={colunas}
      data={data}
      numColumns={colunas}
      keyExtractor={(nft) => nft.id}
      contentContainerStyle={{ padding: espaco(3), gap: espaco(3) }}
      columnWrapperStyle={{ gap: espaco(3) }}
      ListHeaderComponent={
        <View style={{ paddingBottom: espaco(2) }}>
          <Texto variante="titulo">Mercado</Texto>
          <Texto variante="legenda">Arte digital em edição limitada</Texto>
        </View>
      }
      renderItem={({ item: nft }) => (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${nft.titulo}, a partir de ${formatarEth(nft.precoMinimoEth)}`}
          onPress={() => router.push(`/nft/${nft.id}`)}
          style={({ pressed }) => ({
            flex: 1 / colunas, backgroundColor: cores.surface, borderColor: cores.borderSubtle,
            borderWidth: 1, borderRadius: 3, padding: espaco(2), opacity: pressed ? 0.85 : 1,
          })}
        >
          <ImagemNft chave={nft.imagemUrl} rotulo={nft.titulo} />
          <Texto variante="rotulo" numberOfLines={1} style={{ marginTop: espaco(2) }}>{nft.titulo}</Texto>
          <Texto variante="legenda" numberOfLines={1}>{nft.autor}</Texto>
          <Texto style={{ color: cores.primary, marginTop: espaco(1) }}>{formatarEth(nft.precoMinimoEth)}</Texto>
        </Pressable>
      )}
    />
  );
}
