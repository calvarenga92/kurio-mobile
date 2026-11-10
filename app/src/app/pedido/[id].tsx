import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { formatarEth } from '@calvarenga92/kurio-regras';
import { consultaPedido } from '@/api/consultas';
import { Botao, Cartao, Carregando, Falha, Linha, Texto } from '@/ui/base';
import { PainelCenarios } from '@/ui/PainelCenarios';
import { ResumoCotacao } from '@/ui/ResumoCotacao';
import { cores, espaco } from '@/ui/tema';

export default function Recibo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: pedido, isPending, isError, refetch } = useQuery(consultaPedido(id));

  if (isPending) return <Carregando />;
  if (isError) return <Falha mensagem="Pedido não encontrado." aoTentar={refetch} />;

  const confirmado = pedido.status === 'CONFIRMADO';

  return (
    <ScrollView contentContainerStyle={{ padding: espaco(4), gap: espaco(4) }}>
      <View>
        <Texto variante="titulo" style={{ color: confirmado ? cores.success : cores.danger }}>
          {confirmado ? 'Pagamento confirmado' : 'Pagamento recusado'}
        </Texto>
        <Texto variante="legenda">Pedido {pedido.id}</Texto>
        {pedido.motivoRecusa && <Texto style={{ color: cores.danger }}>{pedido.motivoRecusa}</Texto>}
      </View>

      <Cartao>
        {pedido.itens.map((item) => (
          <Linha
            key={item.edicaoId}
            termo={`${item.quantidade}× ${item.titulo} (${item.rotuloEdicao})`}
            valor={formatarEth(item.subtotalEth)}
          />
        ))}
      </Cartao>
      <ResumoCotacao valores={pedido} />

      <Cartao estilo={{ gap: espaco(1) }}>
        <Texto variante="legenda">Carteira: {pedido.carteira.apelido} · {pedido.carteira.rede}</Texto>
        {pedido.referenciaTransacao && (
          <Texto variante="legenda" numberOfLines={1} ellipsizeMode="middle" selectable>
            Transação: {pedido.referenciaTransacao}
          </Texto>
        )}
      </Cartao>

      <PainelCenarios />
      <Botao aoPressionar={() => router.replace('/')}>Voltar ao mercado</Botao>
    </ScrollView>
  );
}
