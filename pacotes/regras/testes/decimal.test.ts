import { describe, expect, it } from 'vitest';
import {
  comparar, formatarEth, menor, multiplicar, paraTexto, paraUnidades, percentual, somar, subtrair,
} from '../src/decimal';

describe('decimal', () => {
  it('0.1 + 0.2 dá 0.3, não 0.30000000000000004', () => {
    expect(somar('0.1', '0.2')).toBe('0.3');
  });

  it('preserva as 18 casas em toda operação', () => {
    expect(somar('0.000000000000000001', '0.000000000000000002')).toBe('0.000000000000000003');
    expect(multiplicar('0.00005', 3)).toBe('0.00015');
    expect(percentual('0.0165', 10)).toBe('0.00165');
  });

  it('não acumula resto: mil somas de 0.0001 dão exatamente 0.1', () => {
    let acc = '0';
    for (let i = 0; i < 1000; i++) acc = somar(acc, '0.0001');
    expect(acc).toBe('0.1');
  });

  it('percentual trunca abaixo de 1 wei', () => {
    expect(percentual('0.000000000000000001', 50)).toBe('0');
  });

  it('negativos e zero', () => {
    expect(subtrair('1', '1.5')).toBe('-0.5');
    expect(paraTexto(paraUnidades('-0.0000001'), 4)).toBe('0');
  });

  it('recusa formatos que viriam de float', () => {
    expect(() => paraUnidades('1e-7')).toThrow(RangeError);
    expect(() => paraUnidades('abc')).toThrow(RangeError);
    expect(() => paraUnidades('')).toThrow(RangeError);
    expect(() => multiplicar('1', 1.5)).toThrow(RangeError);
  });

  it('compara sem converter para Number', () => {
    expect(comparar('0.30000000000000001', '0.3')).toBe(1);
    expect(menor('2.29', '0.99')).toBe('0.99');
  });

  it('formatação só na borda: 2 casas mínimas, até 6', () => {
    expect(formatarEth('2.8')).toBe('2.80 ETH');
    expect(formatarEth('0.0165')).toBe('0.0165 ETH');
    expect(formatarEth('0.00165')).toBe('0.00165 ETH');
    expect(formatarEth('3')).toBe('3.00 ETH');
  });
});
