# Kurio mobile

Versão React Native (Expo) do [Kurio](https://github.com/calvarenga92/calvarenga-jungle-nft), marketplace de arte digital.

**O case: a mesma regra de negócio, duas plataformas.** As regras de dinheiro e de checkout não foram reescritas para o mobile: vivem no pacote [`@calvarenga92/kurio-regras`](./pacotes/regras), publicado no npm e consumido pelo app web e por este app.

## Estrutura

```
pacotes/regras/   regras de negócio em TypeScript puro (sem React, DOM ou React Native)
app/              app Expo (expo-router, React Query, axios)
```

O pacote compila sem os tipos de DOM ou Node (`"lib": ["ES2020"]`, `"types": []`). Se alguém usar `window`, `crypto` ou `localStorage` numa regra, o build quebra. É isso que garante que ela roda igual no navegador e no Hermes.

## As duas regras

### 1. Dinheiro em inteiro de 18 casas

Valores em ETH trafegam como string decimal e toda conta é feita em `bigint` na escala de 18 casas (1 wei). Nenhum passo intermediário corta casas; a formatação acontece uma vez, em `formatarEth`, na borda da interface.

Por que 18 e não 4: 4 casas é precisão de exibição, não de dinheiro. Cortar a cada operação acumula resto. Antes, `percentual('0.0165', 10)` virava `0.0016` e o total saía `0.0191` em vez de `0.01905`.

### 2. Checkout idempotente

Cada tentativa de pagamento carrega uma `Idempotency-Key` própria. Repetir a mesma chave devolve o mesmo pedido em vez de criar cobrança nova.

- **Cliente** (`criarTentativaPagamento`): a chave nasce com a tentativa, não com o clique. Se a resposta não chegar (timeout, queda de rede), o reenvio vai com a mesma chave **e o mesmo corpo**, mesmo que a tela tenha recarregado a cotação nesse meio-tempo. A chave só muda depois que o servidor cria o pedido.
- **Servidor** (`criarGuardaIdempotente`): mesma chave com o mesmo corpo devolve o pedido original; com outro corpo, `409 CHAVE_IDEMPOTENCIA_CONFLITANTE`. Um reenvio que chega enquanto a primeira requisição ainda está processando se junta a ela, em vez de passar pela checagem com o registro ainda vazio.

O gerador de UUID é injetado: `crypto.randomUUID` no web, `expo-crypto` no mobile (o Hermes não tem `crypto.randomUUID`).

## Demonstração no app

Na tela de pagamento há um painel **Simular rede** e um contador de **cobranças criadas no servidor**:

| Cenário | O que acontece | O que prova |
|---|---|---|
| Internet cai depois do pagamento | O servidor cobra, a resposta se perde. O app mostra "Tentar pagar de novo". | O reenvio devolve o mesmo pedido; o contador não sobe. |
| Servidor lento | O app desiste em 4 s, o servidor leva 7 s. O usuário reenvia com o servidor ainda processando. | O reenvio se junta à requisição em andamento; uma cobrança só. |
| Preço muda | A cotação vista no app não é a do servidor no momento da cobrança. | O pedido é recusado com `COTACAO_DESATUALIZADA` e nada é cobrado. |
| Carteira recusa | O pedido é criado como recusado. | Recibo de recusa; a próxima tentativa tem chave nova. |

O backend é simulado dentro do app por um adapter do axios. O app fala HTTP normalmente e não sabe que o servidor é local, como o MSW faz no web.

## Rodando

Requer Node 18+.

```bash
npm install
npm run regras:test        # testes do pacote compartilhado
npm run regras:build
cd app
npx expo start             # abre no Expo Go pelo QR code
npx expo export --platform web --output-dir dist   # versão web estática
```

## Decisões de escopo

- **Sem login no mobile:** o app usa uma conta de demonstração. O foco do case é checkout e dinheiro; a sessão do web depende de `sessionStorage` e precisaria de `expo-secure-store`.
- **Estado em memória:** recarregar o app zera o servidor simulado, o que deixa a demonstração sempre reproduzível.
- **Sem tempo real:** o socket de eventos do web não foi portado.
