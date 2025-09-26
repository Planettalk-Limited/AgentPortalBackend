import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TrainingService } from './training.service';
import { CompleteTrainingDto } from './dto/create-training-material.dto';

@ApiTags('Training & Resources')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('agents/training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get()
  @ApiOperation({ summary: 'Get assigned training materials' })
  @ApiResponse({ status: 200, description: 'List of assigned training materials' })
  async getAssignedTraining(
    @Request() req: any,
    @Query('type') type?: string,
  ) {
    return this.trainingService.getAssignedTraining(req.user.id, type as any);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get user training progress' })
  @ApiResponse({ status: 200, description: 'Training progress information' })
  async getTrainingProgress(@Request() req: any) {
    return this.trainingService.getUserTrainingProgress(req.user.id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete training material' })
  @ApiResponse({ status: 200, description: 'Training completed successfully' })
  @ApiResponse({ status: 404, description: 'Training material not found' })
  @ApiResponse({ status: 400, description: 'Training already completed or prerequisites not met' })
  async completeTraining(
    @Request() req: any,
    @Param('id') id: string,
    @Body() completeTrainingDto: CompleteTrainingDto,
  ) {
    return this.trainingService.completeTraining(req.user.id, id, completeTrainingDto);
  }
}
