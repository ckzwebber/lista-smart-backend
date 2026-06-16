# CartWise

Backend for the **CartWise** personalized recommendation system, built as an academic project for a Mobile Development course.

The goal is to demonstrate that different user behaviors produce different recommendations — no database, no machine learning, just simple heuristics inspired by real-world marketplaces.

---

## Requirements

- Node.js 18+
- pnpm (or npm)

---

## Getting started

```bash
pnpm install
pnpm start:dev
```

Server runs at `http://localhost:3000`.

---

## Interactive dashboard

With the server running, open `http://localhost:3000` in the browser to access the in-memory visualization panel.

The dashboard polls every 2 seconds and displays the full backend state:

| Section | What it shows |
|---------|---------------|
| **Event pipeline** | Animated flow across 5 stages: request → event → memory → algorithm → response |
| **Live memory** | Event counters, list items, and catalog size |
| **Algorithms** | Live output of all 5 recommendation algorithms for the selected user |
| **Co-occurrence matrix** | Product pairs that appear together in lists, with frequency bars |
| **Event log** | Chronological history of all registered events |
| **Virtual carts** | `ADD_TO_LIST` events grouped by user — base for the co-occurrence algorithm |

Use the user buttons (1–4) to switch context and observe how recommendations change per user history. The **Reset Memory** button calls `POST /debug/reset` and clears all arrays — useful for restarting a demo without restarting the server.

---

## Testing

### Seed

With the server running, execute the seed script to populate memory and verify all endpoints at once:

```bash
node seed.js
```

> Memory resets on every server restart. Re-run the seed after each restart.

### Endpoints

All examples use `curl`. The `user-id` header identifies the user — there is no authentication.

#### Products

```bash
curl http://localhost:3000/products
curl -H "user-id: 1" http://localhost:3000/products/1
```

#### Shopping list

```bash
curl -X POST http://localhost:3000/shopping-list/items \
  -H "Content-Type: application/json" \
  -H "user-id: 1" \
  -d '{"productId": 42}'

curl http://localhost:3000/shopping-list/items
curl -H "user-id: 1" http://localhost:3000/shopping-list/suggestions
```

#### Purchases

```bash
curl -X POST http://localhost:3000/purchases \
  -H "Content-Type: application/json" \
  -H "user-id: 1" \
  -d '{"productId": 1}'
```

#### Recommendations

```bash
curl -H "user-id: 1" http://localhost:3000/recommendations
curl http://localhost:3000/recommendations/trending
curl -H "user-id: 1" http://localhost:3000/recommendations/restock
curl http://localhost:3000/products/42/recommendations
```

#### Debug / metrics

```bash
curl http://localhost:3000/events
curl http://localhost:3000/stats/products
curl http://localhost:3000/stats/categories
curl http://localhost:3000/stats/add-to-list
```

---

## How it works

### Behavior events

Every user interaction generates an in-memory event with a weight used by the recommendation algorithms:

| Event | Triggered when | Weight |
|-------|---------------|--------|
| `PRODUCT_VIEW` | User opens a product detail screen | 1 |
| `ADD_TO_LIST` | User adds a product to the shopping list | 3 |
| `PURCHASE` | User registers a purchase | used in restock |

### Recommendation algorithms

**1. Personalized by category** — `GET /recommendations`
Computes the user's favorite category by summing event weights (`VIEW × 1 + ADD_TO_LIST × 3`). Returns products from that category the user hasn't interacted with yet.

**2. Related products** — `GET /products/:id/recommendations`
Co-occurrence: groups `ADD_TO_LIST` events by user and counts how often two products appear together. Returns the most frequent pairs.

**3. List suggestions** — `GET /shopping-list/suggestions`
Applies co-occurrence across all items currently in the user's list. Example: list has Rice → suggests Beans, Oil, Pasta.

**4. Trending** — `GET /recommendations/trending`
The 10 most added products globally (last 50 `ADD_TO_LIST` events). Not personalized — useful for the home screen.

**5. Restock** — `GET /recommendations/restock`
For each product the user has purchased, computes time since last purchase and compares against the estimated consumption interval for that category:

| Category | Interval |
|----------|----------|
| Dairy, Produce, Meat, Bakery | 7 days |
| Beverages, Frozen | 14 days |
| Cleaning, Hygiene, Grocery | 30 days |

---

## Frontend integration (React Native)

### Base URL

```ts
const API_URL = 'http://localhost:3000'; // local dev
```

On a physical device, replace with the machine's local IP (e.g. `http://192.168.1.10:3000`).

### User identification

No authentication. Personalized requests pass `userId` via header:

```ts
const headers = {
  'Content-Type': 'application/json',
  'user-id': String(userId),
};
```

A fixed `userId` per device is enough for demo purposes. Generate once and persist with `AsyncStorage`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getUserId(): Promise<string> {
  let id = await AsyncStorage.getItem('userId');
  if (!id) {
    id = String(Math.floor(Math.random() * 9000) + 1000);
    await AsyncStorage.setItem('userId', id);
  }
  return id;
}
```

### Screen → endpoint mapping

| Screen | Endpoint | Notes |
|--------|----------|-------|
| Home | `GET /recommendations/trending` | "Trending" section |
| Home | `GET /recommendations` | "For you" section (requires `user-id`) |
| Product detail | `GET /products/:id` | Pass `user-id` to register the VIEW |
| Product detail | `GET /products/:id/recommendations` | "Others also bought" section |
| Shopping list | `POST /shopping-list/items` | "Add to list" button |
| Shopping list | `GET /shopping-list/suggestions` | "Add these too" section |
| Checkout | `POST /purchases` | One call per purchased product |
| Home / notification | `GET /recommendations/restock` | "Running low?" section |

### TypeScript types

```ts
interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  price: number;
  imageUrl: string;
  tags: string[];
}

interface ShoppingListItem {
  id: number;
  userId: number;
  productId: number;
  addedAt: string;
}
```

---

MIT License
