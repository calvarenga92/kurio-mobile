import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import {
  CABECALHO_IDEMPOTENCIA, criarTentativaPagamento, type Pedido,
} from '@calvarenga92/kurio-regras';
import { ErroApi, cliente } from '@/api/cliente';
import { chaves } from '@/api/consultas';

interface Entrada {
  versaoCotacao: string;
  carteiraId: string;
}

/**
 * Gero a chave na montagem da tentativa e só troco quando o pedido é confirmado.
 * Reenviar após timeout reaproveita o pedido em vez de cobrar duas vezes.
 * A política vem do pacote compartilhado; aqui só entra o gerador de UUID do Expo,
 * porque o Hermes não tem crypto.randomUUID.
 */
export function useFinalizarPedido() {
  const qc = useQueryClient();
  const chave = useRef(criarTentativaPagamento<Entrada>(randomUUID));

  const mutacao = useMutation({
    mutationFn: async (entrada: Entrada) => {
      const tentativa = chave.current.preparar(entrada);
      const { data } = await cliente.post<Pedido>('/pedidos', tentativa.entrada, {
        headers: { [CABECALHO_IDEMPOTENCIA]: tentativa.chave },
      });
      return data;
    },
    onSuccess: (pedido) => {
      chave.current.registrarDesfecho('pedido-criado');
      qc.setQueryData(chaves.pedido(pedido.id), pedido);
      void qc.invalidateQueries({ queryKey: chaves.carrinho });
      void qc.invalidateQueries({ queryKey: chaves.nfts });
      void qc.invalidateQueries({ queryKey: chaves.pedidos });
      void qc.invalidateQueries({ queryKey: chaves.diagnostico });
    },
    onError: (erro) => {
      const semResposta = !(erro instanceof ErroApi) || erro.status === 0;
      chave.current.registrarDesfecho(semResposta ? 'sem-resposta' : 'erro-do-servidor');
      void qc.invalidateQueries({ queryKey: chaves.diagnostico });
    },
  });

  return { ...mutacao, chaveAtual: chave.current.chave };
}
