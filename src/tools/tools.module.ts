import { Module } from '@nestjs/common';

import { OrderModule } from '../order/order.module';
import { ToolExecutorService } from './tool-executor.service';

@Module({
  imports: [OrderModule],
  providers: [ToolExecutorService],
  exports: [ToolExecutorService],
})
export class ToolsModule {}
