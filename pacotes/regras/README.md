# @calvarenga92/kurio-regras

Regras de negócio do Kurio compartilhadas entre o app web (React + Vite) e o app mobile (Expo).

- `decimal`: valores em ETH como string decimal, contas em `bigint` de 18 casas, formatação só na borda (`formatarEth`).
- `cotacao`: `calcularTotais`, `versaoDaCotacao`, `CUPONS`, `TAXA_REDE`.
- `idempotencia`: `criarTentativaPagamento` (cliente) e `criarGuardaIdempotente` (servidor).
- `tipos`: contratos da API.

TypeScript puro, sem dependências e sem APIs de plataforma. Veja o [README do monorepo](https://github.com/calvarenga92/kurio-mobile#readme) para o porquê de cada decisão.
