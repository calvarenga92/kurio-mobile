/**
 * Valores monetários em string decimal, somados como inteiros de 18 casas.
 * Evita o erro de ponto flutuante que faz 0.1 + 0.2 dar 0.30000000000000004.
 *
 * As operações preservam as 18 casas: nenhum passo intermediário corta o valor.
 * O corte para exibição acontece uma única vez, em formatarEth, na borda da interface.
 */
const CASAS = 18n;
const ESCALA = 10n ** CASAS;

const FORMATO = /^-?\d*(\.\d*)?$/;

export function paraUnidades(valor: string): bigint {
  const limpo = valor.trim();
  if (!FORMATO.test(limpo) || limpo === '' || limpo === '-' || limpo === '.') {
    throw new RangeError(`Valor monetário inválido: "${valor}"`);
  }
  const [inteira, decimal = ''] = limpo.split('.');
  const preenchida = decimal.padEnd(Number(CASAS), '0').slice(0, Number(CASAS));
  const negativo = inteira.startsWith('-');
  const absoluta = BigInt((negativo ? inteira.slice(1) : inteira) + preenchida);
  return negativo ? -absoluta : absoluta;
}

export function paraTexto(unidades: bigint, casas = Number(CASAS)): string {
  const negativo = unidades < 0n;
  const absoluta = negativo ? -unidades : unidades;
  const inteira = absoluta / ESCALA;
  const resto = (absoluta % ESCALA).toString().padStart(Number(CASAS), '0');
  const decimal = resto.slice(0, casas).replace(/0+$/, '');
  const texto = decimal ? `${inteira}.${decimal}` : String(inteira);
  return negativo && texto !== '0' ? `-${texto}` : texto;
}

export const somar = (a: string, b: string) => paraTexto(paraUnidades(a) + paraUnidades(b));
export const subtrair = (a: string, b: string) => paraTexto(paraUnidades(a) - paraUnidades(b));
export const multiplicar = (a: string, n: number) => {
  if (!Number.isInteger(n)) throw new RangeError(`Quantidade deve ser inteira: ${n}`);
  return paraTexto(paraUnidades(a) * BigInt(n));
};

/**
 * pct aceita até duas casas (12.5 = 12,5%). O resultado é truncado na 18ª casa,
 * a menor unidade do ETH: abaixo dela não existe valor a cobrar.
 */
export function percentual(valor: string, pct: number): string {
  return paraTexto((paraUnidades(valor) * BigInt(Math.round(pct * 100))) / 10000n);
}

export function comparar(a: string, b: string): -1 | 0 | 1 {
  const diferenca = paraUnidades(a) - paraUnidades(b);
  return diferenca === 0n ? 0 : diferenca < 0n ? -1 : 1;
}

export const menor = (a: string, b: string) => (comparar(a, b) <= 0 ? a : b);

const CASAS_EXIBICAO_MAX = 6;

/**
 * Exibição com no mínimo 2 casas e só as casas que existem até 6:
 * "2.8" vira "2.80", "0.0165" se mantém, "0.00165" não vira "0.0016".
 * Mostrar a casa que existe mantém o recibo somando na tela.
 */
export function formatarEth(valor: string): string {
  const texto = paraTexto(paraUnidades(valor), CASAS_EXIBICAO_MAX);
  const [inteira, decimal = ''] = texto.split('.');
  return `${inteira}.${decimal.padEnd(2, '0')} ETH`;
}
