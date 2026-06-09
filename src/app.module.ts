import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { EventsModule } from './events/events.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { StatsModule } from './stats/stats.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { PurchasesModule } from './purchases/purchases.module';
import { DebugModule } from './debug/debug.module';

@Module({
  imports: [ProductsModule, EventsModule, ShoppingListModule, StatsModule, RecommendationsModule, PurchasesModule, DebugModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
