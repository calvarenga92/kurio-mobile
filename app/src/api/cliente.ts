import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse } from 'axios';
import type { CodigoErro, CorpoErro } from '@calvarenga92/kurio-regras';
import { atender } from '@/servidor';

/** Menor que a latência do cenário "lento": o app desiste antes de o servidor terminar. */
export const TIMEOUT_MS = 4000;

/**
 * Troca a camada de rede pelo servidor local, mantendo o contrato do axios.
 * O processamento continua depois do timeout, como num servidor de verdade:
 * o cliente desiste, mas a cobrança pode acontecer mesmo assim.
 */
const adaptadorLocal: AxiosAdapter = async (config) => {
  const cabecalhos = AxiosHeaders.from(config.headers);
  const corpo = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : config.data;

  const processamento = atender({
    metodo: config.method ?? 'get',
    caminho: config.url ?? '/',
    corpo,
    cabecalho: (nome) => {
      const valor = cabecalhos.get(nome);
      return typeof valor === 'string' ? valor : null;
    },
  });

  let cronometro: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    cronometro = setTimeout(() => {
      rejeitar(new AxiosError('timeout', AxiosError.ECONNABORTED, config));
    }, config.timeout || TIMEOUT_MS);
  });

  try {
    const resposta = await Promise.race([processamento, limite]);
    if (resposta.perderResposta) {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    }
    const axiosResposta: AxiosResponse = {
      data: resposta.corpo,
      status: resposta.status,
      statusText: String(resposta.status),
      headers: {},
      config,
    };
    if (resposta.status >= 400) {
      throw new AxiosError('Erro', AxiosError.ERR_BAD_RESPONSE, config, null, axiosResposta);
    }
    return axiosResposta;
  } finally {
    clearTimeout(cronometro);
  }
};

export const cliente = axios.create({
  baseURL: '/',
  timeout: TIMEOUT_MS,
  adapter: adaptadorLocal,
});

/** Erro de aplicação: o front decide pelo código, nunca pelo texto da mensagem. */
export class ErroApi extends Error {
  readonly codigo: CodigoErro;
  readonly status: number;
  readonly campos?: Record<string, string>;

  constructor(corpo: CorpoErro, status: number) {
    super(corpo.mensagem);
    this.name = 'ErroApi';
    this.codigo = corpo.codigo;
    this.status = status;
    this.campos = corpo.campos;
  }
}

function normalizar(erro: unknown): ErroApi {
  const axiosErro = erro as AxiosError<CorpoErro>;

  if (axiosErro.response?.data?.codigo) {
    return new ErroApi(axiosErro.response.data, axiosErro.response.status);
  }
  if (axiosErro.code === 'ECONNABORTED' || !axiosErro.response) {
    return new ErroApi(
      { codigo: 'SEM_CONEXAO', mensagem: 'Não foi possível falar com o servidor.' },
      0,
    );
  }
  return new ErroApi(
    { codigo: 'ERRO_DESCONHECIDO', mensagem: 'Algo deu errado. Tente de novo.' },
    axiosErro.response.status,
  );
}

cliente.interceptors.response.use(
  (resposta) => resposta,
  (erro) => Promise.reject(normalizar(erro)),
);
