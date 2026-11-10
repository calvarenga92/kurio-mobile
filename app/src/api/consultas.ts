import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Carteira, Cotacao, Nft, NftResumo, Pedido } from '@calvarenga92/kurio-regras';
import { cliente } from './cliente';
import type { Cenario } from '@/servidor';

export const chaves = {
  nfts: ['nfts'] as const,
  nft: (id: string) => ['nfts', id] as const,
  carrinho: ['carrinho'] as const,
  carteiras: ['carteiras'] as const,
  pedidos: ['pedidos'] as const,
  pedido: (id: string) => ['pedidos', id] as const,
  diagnostico: ['diagnostico'] as const,
};

const obter = async <T,>(url: string) => (await cliente.get<T>(url)).data;

export const consultaNfts = queryOptions({ queryKey: chaves.nfts, queryFn: () => obter<NftResumo[]>('/nfts') });
export const consultaNft = (id: string) =>
  queryOptions({ queryKey: chaves.nft(id), queryFn: () => obter<Nft>(`/nfts/${id}`) });
export const consultaCarrinho = queryOptions({ queryKey: chaves.carrinho, queryFn: () => obter<Cotacao>('/carrinho') });
export const consultaCarteiras = queryOptions({ queryKey: chaves.carteiras, queryFn: () => obter<Carteira[]>('/carteiras') });
export const consultaPedido = (id: string) =>
  queryOptions({ queryKey: chaves.pedido(id), queryFn: () => obter<Pedido>(`/pedidos/${id}`) });

export interface Diagnostico { cobrancas: number; chavesRegistradas: number; cenario: Cenario }
export const consultaDiagnostico = queryOptions({
  queryKey: chaves.diagnostico, queryFn: () => obter<Diagnostico>('/diagnostico'),
});

/** Toda mutação do carrinho devolve a cotação nova: gravo direto no cache em vez de refazer o GET. */
function useMutacaoCarrinho<E>(executar: (entrada: E) => Promise<Cotacao>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: executar,
    onSuccess: (cotacao) => qc.setQueryData(chaves.carrinho, cotacao),
  });
}

export const useAdicionarItem = () =>
  useMutacaoCarrinho(async (entrada: { nftId: string; edicaoId: string }) =>
    (await cliente.post<Cotacao>('/carrinho/itens', entrada)).data);

export const useAlterarQuantidade = () =>
  useMutacaoCarrinho(async ({ id, quantidade }: { id: string; quantidade: number }) =>
    (await cliente.patch<Cotacao>(`/carrinho/itens/${id}`, { quantidade })).data);

export const useAplicarCupom = () =>
  useMutacaoCarrinho(async (codigo: string) =>
    (await cliente.post<Cotacao>('/carrinho/cupom', { codigo })).data);

export const useRemoverCupom = () =>
  useMutacaoCarrinho(async (_: void) => (await cliente.delete<Cotacao>('/carrinho/cupom')).data);

export function useDefinirCenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cenario: Cenario) => cliente.put('/diagnostico/cenario', { cenario }),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.diagnostico }),
  });
}

export function useResetar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => cliente.post('/diagnostico/resetar'),
    onSuccess: () => qc.resetQueries(),
  });
}
