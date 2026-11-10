/** Valores em ETH trafegam como string decimal para preservar precisão. */
export type Eth = string;

export type OrdenacaoNft =
  | 'recentes'
  | 'preco-asc'
  | 'preco-desc'
  | 'populares';

export interface Colecao {
  id: string;
  nome: string;
}

export interface Edicao {
  id: string;
  rotulo: string;
  precoEth: Eth;
  disponivel: number;
  limitePorPedido: number;
}

export interface NftResumo {
  id: string;
  slug: string;
  titulo: string;
  imagemUrl: string;
  autor: string;
  colecao: Colecao;
  precoMinimoEth: Eth;
  favorito: boolean;
  versao: number;
}

export interface Nft extends NftResumo {
  descricao: string;
  galeria: string[];
  edicoes: Edicao[];
  atributos: Array<{ nome: string; valor: string }>;
}

export interface ConsultaNfts {
  busca?: string;
  colecoes?: string[];
  precoMin?: Eth;
  precoMax?: Eth;
  somenteDisponiveis?: boolean;
  ordenacao?: OrdenacaoNft;
  pagina: number;
  porPagina: number;
}

export interface FaixaPreco {
  minimo: Eth;
  maximo: Eth;
}

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}

export interface ItemCarrinho {
  id: string;
  nftId: string;
  edicaoId: string;
  titulo: string;
  imagemUrl: string;
  rotuloEdicao: string;
  quantidade: number;
  precoUnitarioEth: Eth;
  subtotalEth: Eth;
  disponivel: number;
  versaoNft: number;
}

export interface Cupom {
  codigo: string;
  descricaoDesconto: string;
}

export interface Cotacao {
  itens: ItemCarrinho[];
  subtotalEth: Eth;
  descontoEth: Eth;
  taxaRedeEth: Eth;
  totalEth: Eth;
  cupom: Cupom | null;
  /** Identifica a cotação usada na confirmacao; muda quando preço ou disponibilidade mudam. */
  versao: string;
  expiraEm: string;
}

export interface Carrinho {
  itens: ItemCarrinho[];
  cupom: Cupom | null;
}

export type StatusPedido = 'PENDENTE' | 'CONFIRMADO' | 'RECUSADO';

export interface ItemPedido {
  nftId: string;
  edicaoId: string;
  titulo: string;
  imagemUrl: string;
  rotuloEdicao: string;
  quantidade: number;
  precoUnitarioEth: Eth;
  subtotalEth: Eth;
}

export interface Pedido {
  id: string;
  status: StatusPedido;
  /** Snapshot imutavel: alterações posteriores no catálogo não mudam o recibo. */
  itens: ItemPedido[];
  subtotalEth: Eth;
  descontoEth: Eth;
  taxaRedeEth: Eth;
  totalEth: Eth;
  cupom: Cupom | null;
  carteira: { apelido: string; endereco: string; rede: string };
  referenciaTransacao: string | null;
  motivoRecusa: string | null;
  criadoEm: string;
  atualizadoEm: string;
  versao: number;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
}

export interface Sessao {
  usuario: Usuario;
  expiraEm: string;
}

export type RedeCarteira = 'ethereum' | 'polygon' | 'arbitrum';

export interface Carteira {
  id: string;
  apelido: string;
  endereco: string;
  rede: RedeCarteira;
  principal: boolean;
}

export interface CorpoErro {
  codigo: CodigoErro;
  mensagem: string;
  campos?: Record<string, string>;
}

export type CodigoErro =
  | 'DADOS_INVALIDOS'
  | 'CREDENCIAIS_INVALIDAS'
  | 'EMAIL_JA_CADASTRADO'
  | 'SESSAO_EXPIRADA'
  | 'NAO_AUTENTICADO'
  | 'ACESSO_NEGADO'
  | 'NAO_ENCONTRADO'
  | 'CUPOM_INVALIDO'
  | 'CUPOM_EXPIRADO'
  | 'DISPONIBILIDADE_INSUFICIENTE'
  | 'COTACAO_DESATUALIZADA'
  | 'CHAVE_IDEMPOTENCIA_CONFLITANTE'
  | 'FALHA_TRANSITORIA'
  | 'SEM_CONEXAO'
  | 'ERRO_DESCONHECIDO';
