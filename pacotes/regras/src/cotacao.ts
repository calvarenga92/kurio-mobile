import type { Cupom, Eth } from './tipos';
import { multiplicar, percentual, somar, subtrair } from './decimal';

export const TAXA_REDE: Eth = '0.0042';

export const CUPONS: Record<string, { percentual: number; expirado: boolean }> = {
  KURIO10: { percentual: 10, expirado: false },
  COLECIONADOR20: { percentual: 20, expirado: false },
  EXPIRADO50: { percentual: 50, expirado: true },
};

export interface LinhaCotacao {
  edicaoId: string;
  quantidade: number;
  precoUnitarioEth: Eth;
}

export interface Totais {
  subtotalEth: Eth;
  descontoEth: Eth;
  taxaRedeEth: Eth;
  totalEth: Eth;
}

export const subtotalDoItem = (precoUnitarioEth: Eth, quantidade: number): Eth =>
  multiplicar(precoUnitarioEth, quantidade);

/**
 * Totais da cotação em 18 casas, sem corte intermediário.
 * Desconto incide sobre o subtotal; a taxa de rede só existe com itens no carrinho.
 */
export function calcularTotais(itens: LinhaCotacao[], cupom: Cupom | null): Totais {
  const subtotal = itens.reduce(
    (acc, i) => somar(acc, subtotalDoItem(i.precoUnitarioEth, i.quantidade)), '0',
  );

  const regra = cupom ? CUPONS[cupom.codigo] : undefined;
  const desconto = regra && !regra.expirado ? percentual(subtotal, regra.percentual) : '0';
  const temItens = itens.length > 0;
  const taxa = temItens ? TAXA_REDE : '0';
  const total = somar(subtrair(subtotal, desconto), taxa);

  return { subtotalEth: subtotal, descontoEth: desconto, taxaRedeEth: taxa, totalEth: total };
}

/** FNV-1a de 32 bits: estável entre plataformas e sem depender de btoa. */
function resumir(texto: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * A versão resume preço, quantidade e cupom: qualquer mudança invalida a cotação no checkout.
 * O pedido confirma a versão que o usuário viu; se o servidor calcular outra, recusa.
 */
export function versaoDaCotacao(
  itens: LinhaCotacao[], cupom: Cupom | null, extras: string[] = [],
): string {
  const impressao = [
    ...itens.map((i) => `${i.edicaoId}:${i.quantidade}:${i.precoUnitarioEth}`),
    cupom?.codigo ?? '-',
    ...extras,
  ].join('|');
  return `c${impressao.length.toString(16)}-${resumir(impressao)}`;
}
