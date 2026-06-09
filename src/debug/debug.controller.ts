import { Controller, Get, Post } from '@nestjs/common';
import { events } from 'src/events/data/events.data';
import { products } from 'src/products/data/products.data';
import { shoppingList } from 'src/shopping-list/data/shopping-list.data';

@Controller('debug')
export class DebugController {
  @Get('state')
  state() {
    const productMap = new Map(products.map((p) => [p.id, p]));

    const weights: Record<string, number> = { PRODUCT_VIEW: 1, ADD_TO_LIST: 3 };
    const categoryScores: Record<number, Record<string, number>> = {};

    events.forEach((e) => {
      if (e.type !== 'PRODUCT_VIEW' && e.type !== 'ADD_TO_LIST') return;
      if (!categoryScores[e.userId]) categoryScores[e.userId] = {};
      const cat = productMap.get(e.productId)?.category;
      if (cat) {
        categoryScores[e.userId][cat] =
          (categoryScores[e.userId][cat] ?? 0) + (weights[e.type] ?? 0);
      }
    });

    const baskets = new Map<number, Set<number>>();
    events
      .filter((e) => e.type === 'ADD_TO_LIST')
      .forEach((e) => {
        if (!baskets.has(e.userId)) baskets.set(e.userId, new Set());
        baskets.get(e.userId)!.add(e.productId);
      });

    const coOccurrence: Record<string, number> = {};
    baskets.forEach((basket) => {
      const items = [...basket];
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = Math.min(items[i], items[j]);
          const b = Math.max(items[i], items[j]);
          const key = `${a}-${b}`;
          coOccurrence[key] = (coOccurrence[key] ?? 0) + 1;
        }
      }
    });

    const topCoOccurrence = Object.entries(coOccurrence)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, score]) => {
        const [a, b] = key.split('-').map(Number);
        return {
          a: productMap.get(a)?.name ?? `#${a}`,
          b: productMap.get(b)?.name ?? `#${b}`,
          score,
        };
      });

    const basketsDisplay = [...baskets.entries()]
      .slice(-6)
      .map(([userId, basket]) => ({
        userId,
        items: [...basket].map((id) => productMap.get(id)?.name ?? `#${id}`),
      }));

    return {
      counts: {
        events: events.length,
        shoppingList: shoppingList.length,
        products: products.length,
      },
      eventsByType: events.reduce<Record<string, number>>((acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      }, {}),
      recentEvents: [...events]
        .reverse()
        .slice(0, 40)
        .map((e) => ({
          ...e,
          productName: productMap.get(e.productId)?.name,
          category: productMap.get(e.productId)?.category,
        })),
      shoppingList: [...shoppingList]
        .reverse()
        .slice(0, 20)
        .map((i) => ({
          ...i,
          productName: productMap.get(i.productId)?.name,
          category: productMap.get(i.productId)?.category,
        })),
      categoryScores,
      topCoOccurrence,
      baskets: basketsDisplay,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
      })),
    };
  }

  @Post('reset')
  reset() {
    events.splice(0);
    shoppingList.splice(0);
    return { ok: true };
  }
}
