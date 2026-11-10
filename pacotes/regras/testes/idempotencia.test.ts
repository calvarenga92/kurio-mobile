import { describe, expect, it } from 'vitest';
import {
  criarTentativaPagamento, criarGuardaIdempotente, type Criacao, type RegistroIdempotencia,
} from '../src/idempotencia';

/* O pacote compila sem tipos de DOM ou Node: assim nenhuma regra depende de plataforma. */
declare function setTimeout(fn: (valor: unknown) => void, ms: number): unknown;

interface Pedido { id: string }

function montar() {
  const registro: RegistroIdempotencia = {};
  const pedidos: Record<string, Pedido> = {};
  let criados = 0;
  const executar = criarGuardaIdempotente<Pedido, string>({
    registro: () => registro,
    buscar: (id) => pedidos[id],
    identificar: (p) => p.id,
  });
  const criar = (atraso = 0) => async (): Promise<Criacao<Pedido, string>> => {
    await new Promise((r) => setTimeout(r, atraso));
    criados += 1;
    const pedido = { id: `ped-${criados}` };
    pedidos[pedido.id] = pedido;
    return { ok: true, valor: pedido };
  };
  return { executar, criar, registro, contar: () => criados };
}

describe('tentativa do cliente', () => {
  const nova = () => {
    let n = 0;
    return criarTentativaPagamento<{ versaoCotacao: string }>(() => `k${++n}`);
  };

  it('sem resposta: reenvio usa a mesma chave e o mesmo corpo, mesmo com a cotação recarregada', () => {
    const tentativa = nova();
    expect(tentativa.preparar({ versaoCotacao: 'v1' })).toEqual({ chave: 'k1', entrada: { versaoCotacao: 'v1' } });
    tentativa.registrarDesfecho('sem-resposta');
    expect(tentativa.preparar({ versaoCotacao: 'v2' })).toEqual({ chave: 'k1', entrada: { versaoCotacao: 'v1' } });
  });

  it('erro do servidor: mantém a chave e libera o corpo para a correção', () => {
    const tentativa = nova();
    tentativa.preparar({ versaoCotacao: 'v1' });
    tentativa.registrarDesfecho('erro-do-servidor');
    expect(tentativa.preparar({ versaoCotacao: 'v2' })).toEqual({ chave: 'k1', entrada: { versaoCotacao: 'v2' } });
  });

  it('pedido criado: nasce uma tentativa nova', () => {
    const tentativa = nova();
    tentativa.preparar({ versaoCotacao: 'v1' });
    tentativa.registrarDesfecho('pedido-criado');
    expect(tentativa.preparar({ versaoCotacao: 'v3' })).toEqual({ chave: 'k2', entrada: { versaoCotacao: 'v3' } });
  });
});

describe('guarda do servidor', () => {
  const corpo = { versaoCotacao: 'v1', carteiraId: 'w1' };

  it('mesma chave e mesmo corpo devolvem o pedido original', async () => {
    const { executar, criar, contar } = montar();
    const primeiro = await executar('k', corpo, criar());
    const segundo = await executar('k', { ...corpo }, criar());
    expect(primeiro).toEqual({ tipo: 'criado', valor: { id: 'ped-1' } });
    expect(segundo).toEqual({ tipo: 'repetido', valor: { id: 'ped-1' } });
    expect(contar()).toBe(1);
  });

  it('mesma chave com outro corpo é conflitante', async () => {
    const { executar, criar } = montar();
    await executar('k', corpo, criar());
    expect(await executar('k', { ...corpo, carteiraId: 'w2' }, criar()))
      .toEqual({ tipo: 'conflitante' });
  });

  it('reenvio durante o processamento se junta à primeira requisição', async () => {
    const { executar, criar, contar } = montar();
    const [a, b] = await Promise.all([
      executar('k', corpo, criar(30)),
      executar('k', corpo, criar(0)),
    ]);
    expect(contar()).toBe(1);
    expect(a).toEqual({ tipo: 'criado', valor: { id: 'ped-1' } });
    expect(b).toEqual({ tipo: 'repetido', valor: { id: 'ped-1' } });
  });

  it('falha não fica registrada: a mesma chave pode tentar de novo', async () => {
    const { executar, criar, registro } = montar();
    const falha = await executar('k', corpo, async () => ({ ok: false, falha: 'COTACAO_DESATUALIZADA' }));
    expect(falha).toEqual({ tipo: 'falhou', falha: 'COTACAO_DESATUALIZADA' });
    expect(registro.k).toBeUndefined();
    expect((await executar('k', corpo, criar())).tipo).toBe('criado');
  });

  it('chaves diferentes criam pedidos diferentes', async () => {
    const { executar, criar, contar } = montar();
    await executar('k1', corpo, criar());
    await executar('k2', corpo, criar());
    expect(contar()).toBe(2);
  });
});
