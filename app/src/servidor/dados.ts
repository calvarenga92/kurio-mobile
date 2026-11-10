import { percentual, type Carteira, type Nft } from '@calvarenga92/kurio-regras';

/** Mesmo catálogo de demonstração do web. Preços em string decimal: nunca passam por float. */
const COLECOES = [
  { id: 'arte-digital', nome: 'Arte digital' },
  { id: 'fotografia', nome: 'Fotografia' },
  { id: 'musica', nome: 'Música' },
  { id: 'arte-3d', nome: 'Arte 3D' },
  { id: 'colecionaveis', nome: 'Colecionáveis' },
  { id: 'generativa', nome: 'Generativa' },
  { id: 'jogos', nome: 'Jogos' },
  { id: 'assinaturas', nome: 'Assinaturas' },
  { id: 'utilidade', nome: 'Utilidade' },
] as const;

const AUTORES = ['0xLumen', 'Minta Studio', 'Kael', 'Nova Works'];

const CATALOGO: Array<{ titulo: string; colecao: string; preco: string }> = [
  { titulo: 'Emerald Ape #042', colecao: 'arte-digital', preco: '1.99' },
  { titulo: 'Sage Nomad #009', colecao: 'fotografia', preco: '1.69' },
  { titulo: 'Neon Vessel #552', colecao: 'generativa', preco: '2.29' },
  { titulo: 'Cosmic Bloom #118', colecao: 'arte-3d', preco: '1.29' },
  { titulo: 'Violet Nomad #314', colecao: 'arte-digital', preco: '1.39' },
  { titulo: 'Ivory Baron #088', colecao: 'colecionaveis', preco: '1.79' },
  { titulo: 'Golden Beat #207', colecao: 'musica', preco: '0.99' },
  { titulo: 'Golden Signal #160', colecao: 'musica', preco: '0.39' },
  { titulo: 'Golden Frequency #071', colecao: 'musica', preco: '0.59' },
  { titulo: 'Amber Relic #233', colecao: 'colecionaveis', preco: '3.40' },
  { titulo: 'Onyx Drift #415', colecao: 'generativa', preco: '0.72' },
  { titulo: 'Crimson Echo #126', colecao: 'arte-digital', preco: '2.85' },
  { titulo: 'Azure Vertex #390', colecao: 'arte-3d', preco: '0.46' },
  { titulo: 'Pale Oracle #058', colecao: 'fotografia', preco: '5.10' },
  { titulo: 'Lunar Cipher #671', colecao: 'generativa', preco: '0.18' },
  { titulo: 'Solar Husk #284', colecao: 'arte-3d', preco: '1.07' },
  { titulo: 'Quartz Herald #147', colecao: 'colecionaveis', preco: '2.14' },
  { titulo: 'Indigo Pulse #502', colecao: 'musica', preco: '0.64' },
  { titulo: 'Ember Vigil #319', colecao: 'jogos', preco: '0.33' },
  { titulo: 'Copper Mirage #063', colecao: 'arte-digital', preco: '4.20' },
  { titulo: 'Jade Sentinel #228', colecao: 'jogos', preco: '0.88' },
  { titulo: 'Slate Chorus #440', colecao: 'assinaturas', preco: '0.25' },
  { titulo: 'Rust Lantern #175', colecao: 'utilidade', preco: '1.52' },
  { titulo: 'Mint Parable #096', colecao: 'fotografia', preco: '0.91' },
];

/** No mobile a imagem é referenciada pelo índice da ilustração; quem resolve o arquivo é a interface. */
function imagem(indice: number): string {
  return `nft-${String((indice % 12) + 1).padStart(2, '0')}`;
}

function colecaoPorId(id: string) {
  return COLECOES.find((c) => c.id === id) ?? COLECOES[0];
}

export function criarNfts(): Nft[] {
  return CATALOGO.map((item, i) => {
    const colecao = colecaoPorId(item.colecao);
    const esgotado = i === 7 || i === 18;
    const identificador = item.titulo.split('#')[1];

    return {
      id: `nft-${String(i + 1).padStart(3, '0')}`,
      slug: item.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
      titulo: item.titulo,
      imagemUrl: imagem(i),
      autor: AUTORES[i % AUTORES.length],
      colecao: { ...colecao },
      precoMinimoEth: item.preco,
      favorito: false,
      versao: 1,
      descricao:
        'Peça original da coleção, cunhada em edição limitada com metadados verificados na simulação.',
      galeria: [imagem(i), imagem(i + 1), imagem(i + 2)],
      edicoes: [
        {
          id: `${i + 1}-padrao`,
          rotulo: 'Padrão',
          precoEth: item.preco,
          disponivel: esgotado ? 0 : 3 + (i % 5),
          limitePorPedido: 3,
        },
        {
          id: `${i + 1}-rara`,
          rotulo: 'Rara',
          // 2,5x o preço padrão, calculado em 18 casas (o web usa Number(...) * 2.5).
          precoEth: percentual(item.preco, 250),
          disponivel: esgotado ? 0 : 1 + (i % 2),
          limitePorPedido: 1,
        },
      ],
      atributos: [
        { nome: 'Raridade', valor: i % 3 === 0 ? 'Lendária' : 'Comum' },
        { nome: 'Fundo', valor: ['Âmbar', 'Carvão', 'Esmeralda'][i % 3] },
        { nome: 'Token', valor: `#${identificador}` },
      ],
    };
  });
}

export const CARTEIRAS: Carteira[] = [
  {
    id: 'usr-demo-w1',
    apelido: 'Principal',
    endereco: '0x7A3f9C21d4B8e5F06aC1b2E93D847fA50cB61d29',
    rede: 'ethereum',
    principal: true,
  },
  {
    id: 'usr-demo-w2',
    apelido: 'Reserva',
    endereco: '0x19bE04c7F2a3D58e6C0b9A41f7E2d38C5a60B7e4',
    rede: 'polygon',
    principal: false,
  },
];
