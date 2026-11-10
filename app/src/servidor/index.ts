/**
 * Backend simulado dentro do app. Faz o papel do MSW no web: o app conversa por HTTP
 * (axios) e não sabe que o servidor é local. As regras de dinheiro, cotação e
 * idempotência vêm do mesmo pacote que o web usa.
 */
import {
  CABECALHO_IDEMPOTENCIA, CUPONS, calcularTotais, criarGuardaIdempotente, menor,
  subtotalDoItem, versaoDaCotacao,
  type Carrinho, type CodigoErro, type Cotacao, type ItemCarrinho, type ItemPedido, type Nft,
  type NftResumo, type Pedido, type RegistroIdempotencia,
} from '@calvarenga92/kurio-regras';
import { CARTEIRAS, criarNfts } from './dados';

export const CENARIOS = {
  normal: 'Tudo normal',
  'resposta-perdida': 'Internet cai depois do pagamento: o servidor cobra, a resposta não chega',
  lento: 'Servidor lento: o app desiste antes do servidor terminar',
  'preco-alterado': 'Preço muda entre o carrinho e o pagamento',
  'pagamento-recusado': 'Carteira recusa a transação',
} as const;

export type Cenario = keyof typeof CENARIOS;

interface Estado {
  nfts: Nft[];
  carrinho: Carrinho;
  pedidos: Record<string, Pedido>;
  idempotencia: RegistroIdempotencia;
  /** Quantas vezes o servidor de fato criou um pedido. É o número que a idempotência protege. */
  cobrancas: number;
  sequenciaEvento: number;
  cenario: Cenario;
  /** No cenário de resposta perdida, cada chave perde a resposta só uma vez. */
  respostasPerdidas: Set<string>;
}

function estadoInicial(): Estado {
  return {
    nfts: criarNfts(),
    carrinho: { itens: [], cupom: null },
    pedidos: {},
    idempotencia: {},
    cobrancas: 0,
    sequenciaEvento: 0,
    cenario: 'normal',
    respostasPerdidas: new Set(),
  };
}

let estado = estadoInicial();

export const LATENCIA_MS = 450;
export const LATENCIA_LENTA_MS = 7000;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ respostas */

export interface Resposta {
  status: number;
  corpo: unknown;
  /** Sinaliza ao adapter que a resposta deve se perder no caminho, como numa queda de rede. */
  perderResposta?: boolean;
}

const ok = (corpo: unknown, status = 200): Resposta => ({ status, corpo });
const erro = (status: number, codigo: CodigoErro, mensagem: string): Resposta =>
  ({ status, corpo: { codigo, mensagem } });

/* ------------------------------------------------------------------- catálogo */

const proximaVersaoEvento = () => ++estado.sequenciaEvento;

function localizar(nftId: string, edicaoId: string) {
  const nft = estado.nfts.find((n) => n.id === nftId);
  const edicao = nft?.edicoes.find((e) => e.id === edicaoId);
  return nft && edicao ? { nft, edicao } : null;
}

function resumir(nft: Nft): NftResumo {
  const { descricao: _d, galeria: _g, edicoes, atributos: _a, ...resumo } = nft;
  return { ...resumo, precoMinimoEth: edicoes.map((e) => e.precoEth).reduce(menor) };
}

/* ------------------------------------------------------------------- cotação */

function sincronizar(item: ItemCarrinho): ItemCarrinho {
  const alvo = localizar(item.nftId, item.edicaoId);
  if (!alvo) return item;
  const { nft, edicao } = alvo;
  const quantidade = Math.min(item.quantidade, Math.max(edicao.disponivel, 0));
  return {
    ...item,
    titulo: nft.titulo,
    imagemUrl: nft.imagemUrl,
    rotuloEdicao: edicao.rotulo,
    quantidade,
    precoUnitarioEth: edicao.precoEth,
    subtotalEth: subtotalDoItem(edicao.precoEth, quantidade),
    disponivel: edicao.disponivel,
    versaoNft: nft.versao,
  };
}

function cotacaoAtual(): Cotacao {
  const { carrinho } = estado;
  carrinho.itens = carrinho.itens.map(sincronizar).filter((i) => i.quantidade > 0);
  return {
    itens: carrinho.itens,
    ...calcularTotais(carrinho.itens, carrinho.cupom),
    cupom: carrinho.cupom,
    versao: versaoDaCotacao(
      carrinho.itens, carrinho.cupom, [estado.cenario === 'preco-alterado' ? 'alterado' : '-'],
    ),
    expiraEm: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
}

/* ------------------------------------------------------------------- pedidos */

interface CorpoPedido { versaoCotacao: string; carteiraId: string }

const executarIdempotente = criarGuardaIdempotente<Pedido, Resposta>({
  registro: () => estado.idempotencia,
  buscar: (pedidoId) => estado.pedidos[pedidoId],
  identificar: (pedido) => pedido.id,
});

function baixarEstoque(itens: ItemPedido[]): void {
  for (const item of itens) {
    const alvo = localizar(item.nftId, item.edicaoId);
    if (!alvo) continue;
    alvo.edicao.disponivel = Math.max(0, alvo.edicao.disponivel - item.quantidade);
    alvo.nft.versao = proximaVersaoEvento();
  }
}

async function criarPedido(corpo: CorpoPedido) {
  await esperar(estado.cenario === 'lento' ? LATENCIA_LENTA_MS : LATENCIA_MS);

  const cotacao = cotacaoAtual();
  if (cotacao.itens.length === 0) {
    return { ok: false as const, falha: erro(422, 'DADOS_INVALIDOS', 'O carrinho está vazio.') };
  }
  // A versão vista no app é comparada à recalculada aqui, no momento da cobrança.
  if (corpo.versaoCotacao !== cotacao.versao) {
    return {
      ok: false as const,
      falha: erro(409, 'COTACAO_DESATUALIZADA',
        'Os valores do carrinho mudaram. Confira o resumo antes de confirmar.'),
    };
  }
  const indisponivel = cotacao.itens.find((i) => i.disponivel < i.quantidade);
  if (indisponivel) {
    return {
      ok: false as const,
      falha: erro(409, 'DISPONIBILIDADE_INSUFICIENTE',
        `"${indisponivel.titulo}" não tem a quantidade pedida.`),
    };
  }
  const carteira = CARTEIRAS.find((c) => c.id === corpo.carteiraId)
    ?? CARTEIRAS.find((c) => c.principal)!;

  const recusado = estado.cenario === 'pagamento-recusado';
  const agora = new Date().toISOString();
  const id = `ped-${String(Object.keys(estado.pedidos).length + 1).padStart(4, '0')}`;
  const itens: ItemPedido[] = cotacao.itens.map((i) => ({
    nftId: i.nftId, edicaoId: i.edicaoId, titulo: i.titulo,
    imagemUrl: i.imagemUrl, rotuloEdicao: i.rotuloEdicao,
    quantidade: i.quantidade, precoUnitarioEth: i.precoUnitarioEth, subtotalEth: i.subtotalEth,
  }));

  const pedido: Pedido = {
    id,
    status: recusado ? 'RECUSADO' : 'CONFIRMADO',
    itens,
    subtotalEth: cotacao.subtotalEth,
    descontoEth: cotacao.descontoEth,
    taxaRedeEth: cotacao.taxaRedeEth,
    totalEth: cotacao.totalEth,
    cupom: cotacao.cupom,
    carteira: { apelido: carteira.apelido, endereco: carteira.endereco, rede: carteira.rede },
    referenciaTransacao: recusado ? null : `0x${id.replace('ped-', '').padStart(40, 'a')}`,
    motivoRecusa: recusado ? 'A carteira recusou a transação.' : null,
    criadoEm: agora,
    atualizadoEm: agora,
    versao: proximaVersaoEvento(),
  };

  estado.pedidos[id] = pedido;
  if (!recusado) {
    estado.cobrancas += 1;
    baixarEstoque(itens);
    estado.carrinho = { itens: [], cupom: null };
  }
  return { ok: true as const, valor: pedido };
}

async function postarPedido(chave: string | null, corpo: CorpoPedido): Promise<Resposta> {
  if (!chave) return erro(422, 'DADOS_INVALIDOS', `${CABECALHO_IDEMPOTENCIA} é obrigatória.`);

  const desfecho = await executarIdempotente(chave, corpo, () => criarPedido(corpo));
  switch (desfecho.tipo) {
    case 'conflitante':
      return erro(409, 'CHAVE_IDEMPOTENCIA_CONFLITANTE', 'Esta chave foi usada com outro conteúdo.');
    case 'falhou':
      return desfecho.falha;
    case 'repetido':
      return ok(desfecho.valor);
    case 'criado': {
      const perder = estado.cenario === 'resposta-perdida' && !estado.respostasPerdidas.has(chave);
      if (perder) estado.respostasPerdidas.add(chave);
      return { ...ok(desfecho.valor, 201), perderResposta: perder };
    }
  }
}

/* -------------------------------------------------------------------- rotas */

export interface Requisicao {
  metodo: string;
  caminho: string;
  corpo: any;
  cabecalho: (nome: string) => string | null;
}

export async function atender({ metodo, caminho, corpo, cabecalho }: Requisicao): Promise<Resposta> {
  const [rota] = caminho.split('?');
  const partes = rota.split('/').filter(Boolean);
  const chamada = `${metodo.toUpperCase()} /${partes.map((p, i) => (i > 0 && /^(nft|it|ped)-/.test(p) ? ':id' : p)).join('/')}`;
  const id = partes[1];

  if (chamada !== 'POST /pedidos') await esperar(LATENCIA_MS);

  switch (chamada) {
    case 'GET /nfts':
      return ok([...estado.nfts].map(resumir));

    case 'GET /nfts/:id': {
      const nft = estado.nfts.find((n) => n.id === id);
      return nft ? ok(nft) : erro(404, 'NAO_ENCONTRADO', 'NFT não encontrado.');
    }

    case 'GET /carrinho':
      return ok(cotacaoAtual());

    case 'POST /carrinho/itens': {
      const { nftId, edicaoId, quantidade = 1 } = corpo as
        { nftId: string; edicaoId: string; quantidade?: number };
      const alvo = localizar(nftId, edicaoId);
      if (!alvo) return erro(404, 'NAO_ENCONTRADO', 'Edição não encontrada.');
      const { nft, edicao } = alvo;
      const existente = estado.carrinho.itens.find(
        (i) => i.nftId === nftId && i.edicaoId === edicaoId,
      );
      const total = (existente?.quantidade ?? 0) + quantidade;
      if (edicao.disponivel < total) {
        return erro(409, 'DISPONIBILIDADE_INSUFICIENTE', edicao.disponivel === 0
          ? 'Esta edição esgotou.'
          : `Restam ${edicao.disponivel} unidades desta edição.`);
      }
      if (total > edicao.limitePorPedido) {
        return erro(422, 'DADOS_INVALIDOS', `Limite de ${edicao.limitePorPedido} unidades por pedido.`);
      }
      if (existente) existente.quantidade = total;
      else {
        estado.carrinho.itens.push(sincronizar({
          id: `it-${edicao.id}`, nftId, edicaoId,
          titulo: nft.titulo, imagemUrl: nft.imagemUrl, rotuloEdicao: edicao.rotulo,
          quantidade, precoUnitarioEth: edicao.precoEth, subtotalEth: '0',
          disponivel: edicao.disponivel, versaoNft: nft.versao,
        }));
      }
      return ok(cotacaoAtual(), 201);
    }

    case 'PATCH /carrinho/itens/:id': {
      const { quantidade } = corpo as { quantidade: number };
      const item = estado.carrinho.itens.find((i) => i.id === partes[2]);
      if (!item) return erro(404, 'NAO_ENCONTRADO', 'Item não encontrado.');
      const alvo = localizar(item.nftId, item.edicaoId);
      if (alvo && alvo.edicao.disponivel < quantidade) {
        return erro(409, 'DISPONIBILIDADE_INSUFICIENTE',
          `Restam ${alvo.edicao.disponivel} unidades desta edição.`);
      }
      if (alvo && quantidade > alvo.edicao.limitePorPedido) {
        return erro(422, 'DADOS_INVALIDOS',
          `Limite de ${alvo.edicao.limitePorPedido} unidades por pedido.`);
      }
      if (quantidade <= 0) {
        estado.carrinho.itens = estado.carrinho.itens.filter((i) => i.id !== item.id);
      } else item.quantidade = quantidade;
      return ok(cotacaoAtual());
    }

    case 'DELETE /carrinho/itens/:id':
      estado.carrinho.itens = estado.carrinho.itens.filter((i) => i.id !== partes[2]);
      return ok(cotacaoAtual());

    case 'POST /carrinho/cupom': {
      const normalizado = String((corpo as { codigo?: string }).codigo ?? '').trim().toUpperCase();
      const regra = CUPONS[normalizado];
      if (!regra) return erro(422, 'CUPOM_INVALIDO', 'Cupom não encontrado.');
      if (regra.expirado) return erro(422, 'CUPOM_EXPIRADO', 'Este cupom expirou.');
      estado.carrinho.cupom = { codigo: normalizado, descricaoDesconto: `${regra.percentual}% de desconto` };
      return ok(cotacaoAtual());
    }

    case 'DELETE /carrinho/cupom':
      estado.carrinho.cupom = null;
      return ok(cotacaoAtual());

    case 'GET /carteiras':
      return ok(CARTEIRAS);

    case 'POST /pedidos':
      return postarPedido(cabecalho(CABECALHO_IDEMPOTENCIA), corpo as CorpoPedido);

    case 'GET /pedidos':
      return ok(Object.values(estado.pedidos).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)));

    case 'GET /pedidos/:id': {
      const pedido = estado.pedidos[id];
      return pedido ? ok(pedido) : erro(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.');
    }

    case 'GET /diagnostico':
      return ok({
        cobrancas: estado.cobrancas,
        chavesRegistradas: Object.keys(estado.idempotencia).length,
        cenario: estado.cenario,
      });

    case 'PUT /diagnostico/cenario': {
      const { cenario } = corpo as { cenario: Cenario };
      if (!(cenario in CENARIOS)) return erro(422, 'DADOS_INVALIDOS', 'Cenário desconhecido.');
      estado.cenario = cenario;
      estado.respostasPerdidas.clear();
      return ok({ cenario });
    }

    case 'POST /diagnostico/resetar':
      estado = estadoInicial();
      return ok({ ok: true });

    default:
      return erro(404, 'NAO_ENCONTRADO', `Rota desconhecida: ${chamada}`);
  }
}
