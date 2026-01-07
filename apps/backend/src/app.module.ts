import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Modules
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { EndorsementsModule } from './modules/endorsements/endorsements.module';
import { FinanceModule } from './modules/finance/finance.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    ClientsModule,
    PoliciesModule,
    ClaimsModule,
    QuotesModule,
    EndorsementsModule,
    FinanceModule,
    WhatsappModule,
    TasksModule,
    DashboardModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
