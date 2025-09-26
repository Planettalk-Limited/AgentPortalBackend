import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingController } from './training.controller';
import { AdminTrainingController } from './admin-training.controller';
import { TrainingService } from './training.service';
import { TrainingMaterial } from './entities/training-material.entity';
import { TrainingCompletion } from './entities/training-completion.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainingMaterial, TrainingCompletion]),
    UsersModule,
  ],
  controllers: [TrainingController, AdminTrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
