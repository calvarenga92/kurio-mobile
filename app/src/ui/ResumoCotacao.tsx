import { View } from 'react-native';
import { formatarEth, type Cotacao, type Pedido } from '@calvarenga92/kurio-regras';
import { Cartao, Linha } from './base';
import { cores, espaco } from './tema';

/** A formatação acontece só aqui, na borda: até este ponto tudo trafega em 18 casas. */
export function ResumoCotacao({ valores }: { valores: Cotacao | Pedido }) {
  const temDesconto = valores.descontoEth !== '0';
  return (
    <Cartao>
      <Linha termo="Subtotal" valor={formatarEth(valores.subtotalEth)} />
      {temDesconto && (
        <Linha termo={`Desconto (${valores.cupom?.codigo})`} valor={`(-) ${formatarEth(valores.descontoEth)}`} />
      )}
      <Linha termo="Taxa de rede" valor={formatarEth(valores.taxaRedeEth)} />
      <View style={{ height: 1, backgroundColor: cores.borderSubtle, marginVertical: espaco(2) }} />
      <Linha termo="Total" valor={formatarEth(valores.totalEth)} destaque />
    </Cartao>
  );
}
