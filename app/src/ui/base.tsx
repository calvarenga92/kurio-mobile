import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { cores, espaco, fonteMono, raio } from './tema';

export function Texto({ style, variante = 'corpo', ...props }: TextProps & {
  variante?: 'titulo' | 'corpo' | 'legenda' | 'rotulo';
}) {
  return <Text {...props} style={[estilos.texto, estilos[variante], style]} />;
}

interface PropsBotao {
  children: ReactNode;
  aoPressionar: () => void;
  variante?: 'primario' | 'secundario';
  desabilitado?: boolean;
  carregando?: boolean;
  estilo?: ViewStyle;
  rotuloAcessivel?: string;
}

export function Botao({
  children, aoPressionar, variante = 'primario', desabilitado, carregando, estilo, rotuloAcessivel,
}: PropsBotao) {
  const inativo = desabilitado || carregando;
  const primario = variante === 'primario';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={aoPressionar}
      style={({ pressed }) => [
        estilos.botao,
        primario ? estilos.botaoPrimario : estilos.botaoSecundario,
        pressed && { opacity: 0.8 },
        inativo && { opacity: 0.5 },
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={primario ? cores.primaryInk : cores.foreground} />
      ) : (
        <Text style={[estilos.texto, estilos.rotulo, { color: primario ? cores.primaryInk : cores.foreground }]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function Carregando() {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator color={cores.primary} size="large" />
    </View>
  );
}

export function Falha({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <View style={estilos.centro}>
      <Texto style={{ color: cores.danger, textAlign: 'center' }}>{mensagem}</Texto>
      {aoTentar && <Botao variante="secundario" aoPressionar={aoTentar} estilo={{ marginTop: espaco(4) }}>Tentar de novo</Botao>}
    </View>
  );
}

export function Linha({ termo, valor, destaque }: { termo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={estilos.linha}>
      <Texto variante={destaque ? 'rotulo' : 'corpo'} style={!destaque && { color: cores.muted }}>{termo}</Texto>
      <Texto variante={destaque ? 'titulo' : 'corpo'} style={destaque && { color: cores.primary }}>{valor}</Texto>
    </View>
  );
}

export function Cartao({ children, estilo }: { children: ReactNode; estilo?: ViewStyle }) {
  return <View style={[estilos.cartao, estilo]}>{children}</View>;
}

const ILUSTRACOES: Record<string, number> = {
  'nft-01': require('../../assets/nfts/nft-01.svg'),
  'nft-02': require('../../assets/nfts/nft-02.svg'),
  'nft-03': require('../../assets/nfts/nft-03.svg'),
  'nft-04': require('../../assets/nfts/nft-04.svg'),
  'nft-05': require('../../assets/nfts/nft-05.svg'),
  'nft-06': require('../../assets/nfts/nft-06.svg'),
  'nft-07': require('../../assets/nfts/nft-07.svg'),
  'nft-08': require('../../assets/nfts/nft-08.svg'),
  'nft-09': require('../../assets/nfts/nft-09.svg'),
  'nft-10': require('../../assets/nfts/nft-10.svg'),
  'nft-11': require('../../assets/nfts/nft-11.svg'),
  'nft-12': require('../../assets/nfts/nft-12.svg'),
};

export function ImagemNft({ chave, tamanho, rotulo }: { chave: string; tamanho?: number; rotulo: string }) {
  return (
    <Image
      source={ILUSTRACOES[chave]}
      accessibilityLabel={rotulo}
      contentFit="cover"
      style={[{ aspectRatio: 1, borderRadius: raio, backgroundColor: cores.surface2 },
        tamanho ? { width: tamanho } : { width: '100%' }]}
    />
  );
}

export const estilos = StyleSheet.create({
  texto: { color: cores.foreground, fontFamily: fonteMono },
  titulo: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  corpo: { fontSize: 14, lineHeight: 22 },
  legenda: { fontSize: 12, lineHeight: 18, color: cores.muted },
  rotulo: { fontSize: 14, lineHeight: 16, fontWeight: '700' },
  botao: {
    minHeight: 48, paddingHorizontal: espaco(5), borderRadius: raio,
    alignItems: 'center', justifyContent: 'center',
  },
  botaoPrimario: { backgroundColor: cores.primary },
  botaoSecundario: { borderWidth: 1, borderColor: cores.borderStrong, backgroundColor: 'transparent' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco(6) },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: espaco(1.5) },
  cartao: {
    backgroundColor: cores.surface, borderColor: cores.borderSubtle, borderWidth: 1,
    borderRadius: raio, padding: espaco(4),
  },
});
