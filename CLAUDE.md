# cartwise-backend

Backend NestJS para o app mobile **CartWise**, desenvolvido como trabalho acadêmico de Desenvolvimento Mobile. Implementa um sistema de recomendação personalizada de produtos de supermercado baseado em comportamento do usuário, sem banco de dados — tudo em memória via arrays TypeScript.

## Contexto

O CartWise original é um app de lista de compras sem personalização. Este projeto adiciona uma camada de recomendação inspirada em marketplaces reais (Amazon, iFood), usando heurísticas simples mas funcionais, demonstrando que diferentes comportamentos geram diferentes recomendações.

**Critério de sucesso:** usuários com históricos distintos recebem recomendações distintas.

## Arquitetura

- **Framework:** NestJS (TypeScript)
- **Persistência:** nenhuma — três arrays em memória são a fonte de verdade:
  - `src/events/data/events.data.ts` → todos os eventos de comportamento
  - `src/products/data/products.data.ts` → catálogo de produtos (somente leitura)
  - `src/shopping-list/data/shopping-list.data.ts` → lista de compras acumulada
- **Autenticação:** nenhuma — `userId` é passado via header `user-id` em toda requisição que precisar de personalização
- **Sem:** banco de dados, Prisma, TypeORM, Mongoose, repositórios, DTOs formais, validação de entrada além do básico

## Estrutura de Módulos

```
src/
  events/           # Registro e leitura de eventos de comportamento
  products/         # Catálogo + eventos de view + produtos relacionados
  shopping-list/    # Lista de compras + sugestões por co-ocorrência
  recommendations/  # Recomendações personalizadas, trending e restock
  stats/            # Endpoints de debug — métricas brutas dos eventos
  purchases/        # Registro de compras (gera evento PURCHASE)
```

Cada módulo segue sempre a mesma estrutura:
```
modulo/
  entities/   # interfaces TypeScript
  data/       # array em memória (somente nos módulos com estado)
  *.service.ts
  *.controller.ts
  *.module.ts
```

## Endpoints

### Produtos
| Método | Path | Header | Descrição |
|--------|------|--------|-----------|
| GET | `/products` | — | Lista todos os produtos |
| GET | `/products/:id` | `user-id` | Detalhe do produto + registra PRODUCT_VIEW |
| GET | `/products/:id/recommendations` | — | Produtos relacionados por co-ocorrência |

### Lista de Compras
| Método | Path | Header | Body | Descrição |
|--------|------|--------|------|-----------|
| POST | `/shopping-list/items` | `user-id` | `{ productId }` | Adiciona produto + registra ADD_TO_LIST |
| GET | `/shopping-list/items` | — | — | Lista todos os itens |
| GET | `/shopping-list/suggestions` | `user-id` | — | Sugere produtos baseado na lista atual |

### Compras
| Método | Path | Header | Body | Descrição |
|--------|------|--------|------|-----------|
| POST | `/purchases` | `user-id` | `{ productId }` | Registra compra + evento PURCHASE |

### Recomendações
| Método | Path | Header | Descrição |
|--------|------|--------|-----------|
| GET | `/recommendations` | `user-id` | Personalizada por categoria (score híbrido) |
| GET | `/recommendations/trending` | — | Produtos mais adicionados globalmente |
| GET | `/recommendations/restock` | `user-id` | Produtos vencidos para recompra |

### Eventos e Stats (debug)
| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/events` | Todos os eventos registrados |
| GET | `/stats/products` | Views por productId |
| GET | `/stats/categories` | Views por categoria |
| GET | `/stats/add-to-list` | Adições por productId |

## Sistema de Eventos

Todo comportamento do usuário gera um evento. Os serviços criam os eventos internamente — não há endpoint externo para isso.

```ts
interface Event {
  userId: number;
  productId: number;
  type: 'PRODUCT_VIEW' | 'ADD_TO_LIST' | 'PURCHASE';
  createdAt: Date;
}
```

| Evento | Gerado por | Peso na recomendação |
|--------|-----------|----------------------|
| `PRODUCT_VIEW` | `GET /products/:id` | 1 |
| `ADD_TO_LIST` | `POST /shopping-list/items` | 3 |
| `PURCHASE` | `POST /purchases` | usado no restock |

## Algoritmos de Recomendação

### 1. Personalizada por categoria — `GET /recommendations`
Score híbrido: soma `PRODUCT_VIEW × 1 + ADD_TO_LIST × 3` por categoria. Retorna produtos da categoria top que o usuário ainda não interagiu.

### 2. Relacionados por co-ocorrência — `GET /products/:id/recommendations`
Agrupa eventos `ADD_TO_LIST` por `userId` (cada usuário = um "carrinho"). Para cada carrinho que contém o produto alvo, conta os outros produtos. Retorna ordenado por score.

### 3. Sugestões para a lista — `GET /shopping-list/suggestions`
Mesma engine de co-ocorrência, mas aplicada sobre todos os produtos da lista atual do usuário. Agrega scores de todos os itens da lista e exclui o que já está nela.

### 4. Trending — `GET /recommendations/trending`
Top 10 produtos por contagem de `ADD_TO_LIST` nos últimos 50 eventos desse tipo. Global, sem personalização.

### 5. Restock — `GET /recommendations/restock`
Para cada produto comprado pelo usuário (`PURCHASE`), calcula dias desde a última compra e compara com o intervalo de recompra da categoria:

| Categoria | Dias |
|-----------|------|
| Laticínios, Hortifruti, Carnes, Padaria | 7 |
| Bebidas, Congelados | 14 |
| Limpeza, Higiene, Mercearia | 30 |

## Convenções

- **Sem comentários no código** — nomes dos identificadores devem ser autoexplicativos
- `userId` sempre via header `user-id` (string, convertido com `+userId`)
- Arrays de dados são importados diretamente nos services (`import { events } from 'src/events/data/events.data'`)
- `EventsModule` exporta `EventsService`; módulos que precisam dele importam o módulo (não declaram o service como provider diretamente)
- Sem DTOs formais — `@Body('campo')` direto no controller
- Para rodar o seed de teste: `node seed.js` (requer servidor rodando em localhost:3000)

## Evolução Futura (não implementada)

- Persistência com SQLite ou PostgreSQL
- Autenticação real (JWT)
- Cache com Redis
- Dashboard de métricas administrativo
- Containerização com Docker
- Simulação de múltiplos usuários concorrentes
