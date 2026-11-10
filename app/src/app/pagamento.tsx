import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ErroApi } from '@/api/cliente';
import { consultaCarrinho, consultaCarteiras } from '@/api/consultas';
import { useFinalizarPedido } from '@/hooks/usePedido';
import { Botao, Cartao, Carregando, Falha, Texto } from '@/ui/base';
import { PainelCenarios } from '@/ui/PainelCenarios';
import { ResumoCotacao } from '@/ui/ResumoCotacao';
import { cores, espaco, raio } from '@/ui/tema';

export default function Pagamento() {
  const router = useRouter();
  const { data: cotacao, isPending, isError, isFetching, refetch } = useQuery(consultaCarrinho);
  const { data: carteiras } = useQuery(consultaCarteiras);
  const finalizar = useFinalizarPedido();
  const [carteiraId, definirCarteiraId] = useState<string | null>(null);

  useEffect(() => {
    if (!carteiraId && carteiras?.length) {
      definirCarteiraId((carteiras.find((c) => c.principal) ?? carteiras[0]).id);
    }
  }, [carteiras, carteiraId]);

  if (isPending) return <Carregando />;
  if (isError) return <Falha mensagem="Não foi possível carregar a cotação." aoTentar={refetch} />;

  function confirmar() {
    if (!cotacao || !carteiraId) return;
    finalizar.mutate(
      { versaoCotacao: cotacao.versao, carteiraId },
      { onSuccess: (pedido) => router.replace(`/pedido/${pedido.id}`) },
    );
  }

  const erro = finalizar.error instanceof ErroApi ? finalizar.error : null;
  const semConexao = erro?.codigo === 'SEM_CONEXAO';
  const cotacaoVelha = erro?.codigo === 'COTACAO_DESATUALIZADA';
  const vazio = cotacao.itens.length === 0;

  return (
    <ScrollView contentContainerStyle={{ padding: espaco(4), gap: espaco(4) }}>
      <View style={{ gap: espaco(2) }} accessibilityRole="radiogroup">
        <Texto variante="rotulo">Carteira</Texto>
        {carteiras?.map((c) => {
          const ativa = c.id === carteiraId;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: ativa }}
              onPress={() => definirCarteiraId(c.id)}
              disabled={finalizar.isPending || semConexao}
              style={{
                padding: espaco(3), borderRadius: raio, borderWidth: 1,
                borderColor: ativa ? cores.primary : cores.borderSubtle,
              }}
            >
              <Texto variante="rotulo">{c.apelido} · {c.rede}</Texto>
              <Texto variante="legenda" numberOfLines={1} ellipsizeMode="middle">{c.endereco}</Texto>
            </Pressable>
          );
        })}
      </View>

      <ResumoCotacao valores={cotacao} />

      {erro && (
        <Cartao estilo={{ borderColor: cores.danger, gap: espaco(1) }}>
          <Texto variante="rotulo" style={{ color: cores.danger }} accessibilityLiveRegion="assertive">
            {erro.message}
          </Texto>
          {semConexao && (
            <Texto variante="legenda">
              Não sabemos se o pagamento chegou. Tentar de novo é seguro: a tentativa usa a mesma
              chave, então o servidor devolve o pedido já criado em vez de cobrar outra vez.
            </Texto>
          )}
          {cotacaoVelha && (
            <Botao variante="secundario" aoPressionar={() => { finalizar.reset(); void refetch(); }}>
              Ver valores atualizados
            </Botao>
          )}
        </Cartao>
      )}

      <Botao
        aoPressionar={confirmar}
        carregando={finalizar.isPending}
        desabilitado={(vazio && !semConexao) || !carteiraId || cotacaoVelha || (isFetching && !semConexao)}
      >
        {semConexao ? 'Tentar pagar de novo' : 'Pagar'}
      </Botao>
      {vazio && !semConexao && <Texto variante="legenda">O carrinho está vazio.</Texto>}

      <Texto variante="legenda" selectable>Chave desta tentativa: {finalizar.chaveAtual}</Texto>
      <PainelCenarios />
    </ScrollView>
  );
}
