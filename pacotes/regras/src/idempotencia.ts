export const CABECALHO_IDEMPOTENCIA = 'Idempotency-Key';

/* ------------------------------------------------------------------ cliente */

export interface TentativaPagamento<E> {
  /** Chave da tentativa em andamento: a mesma em todo reenvio. */
  readonly chave: string;
  /**
   * O primeiro envio fixa o corpo; enquanto a resposta não chegar, os reenvios usam
   * o mesmo corpo, mesmo que a tela tenha recarregado a cotação nesse meio-tempo.
   * Sem isso, a mesma chave iria com outro corpo e o servidor recusaria como conflito.
   */
  preparar(entrada: E): { chave: string; entrada: E };
  /**
   * Chamado quando a requisição termina. Pedido criado (mesmo recusado pela carteira) abre uma tentativa nova.
   * Resposta de erro do servidor libera o corpo (o usuário corrige e tenta de novo).
   * Sem resposta (timeout, queda de rede), nada muda: não se sabe se a cobrança aconteceu.
   */
  registrarDesfecho(desfecho: 'pedido-criado' | 'erro-do-servidor' | 'sem-resposta'): void;
}

/**
 * A chave nasce com a tentativa, não com o clique. Se nascesse no clique,
 * o reenvio após um timeout iria com chave nova e cobraria de novo.
 * O gerador é injetado porque cada plataforma tem o seu (crypto no web, expo-crypto no mobile).
 */
export function criarTentativaPagamento<E>(gerarId: () => string): TentativaPagamento<E> {
  let chave = gerarId();
  let corpoFixado: E | null = null;
  return {
    get chave() {
      return chave;
    },
    preparar(entrada) {
      corpoFixado ??= entrada;
      return { chave, entrada: corpoFixado };
    },
    registrarDesfecho(desfecho) {
      if (desfecho === 'sem-resposta') return;
      corpoFixado = null;
      if (desfecho === 'pedido-criado') chave = gerarId();
    },
  };
}

/* ----------------------------------------------------------------- servidor */

export interface RegistroIdempotente {
  pedidoId: string;
  impressao: string;
}

export type RegistroIdempotencia = Record<string, RegistroIdempotente>;

export type Criacao<T, F> = { ok: true; valor: T } | { ok: false; falha: F };

export type Desfecho<T, F> =
  | { tipo: 'criado'; valor: T }
  | { tipo: 'repetido'; valor: T }
  | { tipo: 'falhou'; falha: F }
  | { tipo: 'conflitante' };

interface Opcoes<T> {
  /** Registro persistido das chaves já concluídas. */
  registro: () => RegistroIdempotencia;
  /** Recupera o resultado original a partir do id gravado no registro. */
  buscar: (pedidoId: string) => T | undefined;
  identificar: (valor: T) => string;
}

/**
 * Mesma chave e mesmo corpo devolvem o pedido original; mesma chave com outro corpo
 * é recusada. Falhas (cotação desatualizada, estoque) não são registradas: o usuário
 * corrige e tenta de novo com a mesma chave.
 *
 * Reenvio que chega enquanto a primeira requisição ainda está em processamento
 * se junta a ela em vez de passar pela checagem com o registro ainda vazio.
 */
export function criarGuardaIdempotente<T, F>(opcoes: Opcoes<T>) {
  const emAndamento = new Map<string, { impressao: string; promessa: Promise<Criacao<T, F>> }>();

  return async function executar(
    chave: string,
    corpo: unknown,
    criar: () => Promise<Criacao<T, F>>,
  ): Promise<Desfecho<T, F>> {
    const impressao = JSON.stringify(corpo);

    const registrado = opcoes.registro()[chave];
    if (registrado) {
      if (registrado.impressao !== impressao) return { tipo: 'conflitante' };
      const original = opcoes.buscar(registrado.pedidoId);
      if (original !== undefined) return { tipo: 'repetido', valor: original };
    }

    const pendente = emAndamento.get(chave);
    if (pendente) {
      if (pendente.impressao !== impressao) return { tipo: 'conflitante' };
      const resultado = await pendente.promessa;
      return resultado.ok
        ? { tipo: 'repetido', valor: resultado.valor }
        : { tipo: 'falhou', falha: resultado.falha };
    }

    const promessa = criar();
    emAndamento.set(chave, { impressao, promessa });
    try {
      const resultado = await promessa;
      if (!resultado.ok) return { tipo: 'falhou', falha: resultado.falha };
      opcoes.registro()[chave] = { pedidoId: opcoes.identificar(resultado.valor), impressao };
      return { tipo: 'criado', valor: resultado.valor };
    } finally {
      emAndamento.delete(chave);
    }
  };
}
