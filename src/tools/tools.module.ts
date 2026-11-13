import { Module } from '@nestjs/common';

import { OrderModule } from '../order/order.module';
import { ToolExecutorService } from './tool-executor.service';
import { ToolRegistry } from './tool-registry';

@Module({
  imports: [OrderModule],
  providers: [ToolRegistry, ToolExecutorService],
  exports: [ToolRegistry, ToolExecutorService],
})
export class ToolsModule {}
