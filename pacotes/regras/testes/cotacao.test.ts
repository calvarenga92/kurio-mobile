import { describe, expect, it } from 'vitest';
import { calcularTotais, somar, subtrair, versaoDaCotacao } from '../src';

const item = (precoUnitarioEth: string, quantidade = 1, edicaoId = 'e1') =>
  ({ edicaoId, quantidade, precoUnitarioEth });

const cupom = (codigo: string) => ({ codigo, descricaoDesconto: '' });

describe('cotação', () => {
  it('soma subtotal, desconto e taxa sem corte intermediário', () => {
    expect(calcularTotais([item('0.0165')], cupom('KURIO10'))).toEqual({
      subtotalEth: '0.0165', descontoEth: '0.00165', taxaRedeEth: '0.0042', totalEth: '0.01905',
    });
  });

  it('o recibo fecha: subtotal menos desconto mais taxa dá o total', () => {
    const t = calcularTotais([item('1.99', 3), item('0.33', 2, 'e2')], cupom('COLECIONADOR20'));
    expect(somar(subtrair(t.subtotalEth, t.descontoEth), t.taxaRedeEth)).toBe(t.totalEth);
    expect(t.subtotalEth).toBe('6.63');
    expect(t.descontoEth).toBe('1.326');
  });

  it('cupom expirado não desconta e carrinho vazio não cobra taxa', () => {
    expect(calcularTotais([item('1')], cupom('EXPIRADO50')).descontoEth).toBe('0');
    expect(calcularTotais([], null).totalEth).toBe('0');
  });

  it('versão muda com preço, quantidade ou cupom', () => {
    const base = versaoDaCotacao([item('1')], null);
    expect(versaoDaCotacao([item('1')], null)).toBe(base);
    expect(versaoDaCotacao([item('1.01')], null)).not.toBe(base);
    expect(versaoDaCotacao([item('1', 2)], null)).not.toBe(base);
    expect(versaoDaCotacao([item('1')], cupom('KURIO10'))).not.toBe(base);
  });
});
