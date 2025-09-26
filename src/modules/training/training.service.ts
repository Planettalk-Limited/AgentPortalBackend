import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TrainingMaterial, TrainingStatus, TrainingType } from './entities/training-material.entity';
import { TrainingCompletion } from './entities/training-completion.entity';
import { CreateTrainingMaterialDto, UpdateTrainingMaterialDto, CompleteTrainingDto } from './dto/create-training-material.dto';

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(TrainingMaterial)
    private trainingMaterialRepository: Repository<TrainingMaterial>,
    @InjectRepository(TrainingCompletion)
    private trainingCompletionRepository: Repository<TrainingCompletion>,
  ) {}

  // Agent methods
  async getAssignedTraining(userId: string, type?: TrainingType) {
    const query = this.trainingMaterialRepository
      .createQueryBuilder('training')
      .leftJoinAndSelect(
        'training.completions',
        'completion',
        'completion.userId = :userId',
        { userId }
      )
      .where('training.status = :status', { status: TrainingStatus.PUBLISHED });

    if (type) {
      query.andWhere('training.type = :type', { type });
    }

    query.orderBy('training.order', 'ASC');

    const trainings = await query.getMany();

    return trainings.map(training => ({
      ...training,
      isCompleted: training.completions.length > 0,
      completedAt: training.completions[0]?.completedAt || null,
      score: training.completions[0]?.score || null,
    }));
  }

  async completeTraining(userId: string, trainingId: string, completeTrainingDto: CompleteTrainingDto) {
    const training = await this.trainingMaterialRepository.findOne({
      where: { id: trainingId, status: TrainingStatus.PUBLISHED },
    });

    if (!training) {
      throw new NotFoundException('Training material not found');
    }

    // Check if already completed
    const existingCompletion = await this.trainingCompletionRepository.findOne({
      where: { userId, trainingMaterialId: trainingId },
    });

    if (existingCompletion) {
      throw new BadRequestException('Training already completed');
    }

    // Check prerequisites
    if (training.prerequisiteIds) {
      const prerequisiteIds = training.prerequisiteIds.split(',').map(id => id.trim());
      const completedPrerequisites = await this.trainingCompletionRepository.count({
        where: {
          userId,
          trainingMaterialId: In(prerequisiteIds),
        },
      });

      if (completedPrerequisites !== prerequisiteIds.length) {
        throw new BadRequestException('Prerequisites not completed');
      }
    }

    const completion = this.trainingCompletionRepository.create({
      userId,
      trainingMaterialId: trainingId,
      completedAt: new Date(),
      ...completeTrainingDto,
    });

    await this.trainingCompletionRepository.save(completion);

    return { success: true, message: 'Training completed successfully' };
  }

  async getUserTrainingProgress(userId: string) {
    const [
      totalTrainings,
      completedTrainings,
      requiredTrainings,
      completedRequiredTrainings,
    ] = await Promise.all([
      this.trainingMaterialRepository.count({
        where: { status: TrainingStatus.PUBLISHED },
      }),
      this.trainingCompletionRepository.count({
        where: { userId },
        relations: ['trainingMaterial'],
      }),
      this.trainingMaterialRepository.count({
        where: { status: TrainingStatus.PUBLISHED, required: true },
      }),
      this.trainingCompletionRepository
        .createQueryBuilder('completion')
        .innerJoin('completion.trainingMaterial', 'training')
        .where('completion.userId = :userId', { userId })
        .andWhere('training.required = true')
        .getCount(),
    ]);

    return {
      totalTrainings,
      completedTrainings,
      completionPercentage: totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 0,
      requiredTrainings,
      completedRequiredTrainings,
      requiredCompletionPercentage: requiredTrainings > 0 ? Math.round((completedRequiredTrainings / requiredTrainings) * 100) : 0,
    };
  }

  // Admin methods
  async createTrainingMaterial(createTrainingMaterialDto: CreateTrainingMaterialDto) {
    const training = this.trainingMaterialRepository.create(createTrainingMaterialDto);
    return this.trainingMaterialRepository.save(training);
  }

  async getAllTrainingMaterials(
    status?: TrainingStatus,
    type?: TrainingType,
    page: number = 1,
    limit: number = 20,
  ) {
    const query = this.trainingMaterialRepository.createQueryBuilder('training');

    if (status) {
      query.andWhere('training.status = :status', { status });
    }

    if (type) {
      query.andWhere('training.type = :type', { type });
    }

    query
      .orderBy('training.order', 'ASC')
      .addOrderBy('training.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [trainings, total] = await query.getManyAndCount();

    return {
      data: trainings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTrainingMaterialById(id: string) {
    const training = await this.trainingMaterialRepository.findOne({
      where: { id },
      relations: ['completions', 'completions.user'],
    });

    if (!training) {
      throw new NotFoundException('Training material not found');
    }

    return training;
  }

  async updateTrainingMaterial(id: string, updateTrainingMaterialDto: UpdateTrainingMaterialDto) {
    const training = await this.trainingMaterialRepository.findOne({ where: { id } });

    if (!training) {
      throw new NotFoundException('Training material not found');
    }

    Object.assign(training, updateTrainingMaterialDto);
    return this.trainingMaterialRepository.save(training);
  }

  async deleteTrainingMaterial(id: string) {
    const result = await this.trainingMaterialRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Training material not found');
    }

    return { success: true, message: 'Training material deleted successfully' };
  }

  async getTrainingStats() {
    const [
      totalMaterials,
      publishedMaterials,
      totalCompletions,
      byType,
      completionsByMaterial,
    ] = await Promise.all([
      this.trainingMaterialRepository.count(),
      this.trainingMaterialRepository.count({ where: { status: TrainingStatus.PUBLISHED } }),
      this.trainingCompletionRepository.count(),
      this.trainingMaterialRepository
        .createQueryBuilder('training')
        .select('training.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('training.type')
        .getRawMany(),
      this.trainingCompletionRepository
        .createQueryBuilder('completion')
        .innerJoin('completion.trainingMaterial', 'training')
        .select('training.title', 'title')
        .addSelect('COUNT(*)', 'completions')
        .groupBy('training.id, training.title')
        .orderBy('COUNT(*)', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    return {
      totalMaterials,
      publishedMaterials,
      totalCompletions,
      byType,
      topCompletedMaterials: completionsByMaterial,
    };
  }
}
