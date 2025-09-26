import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TrainingService } from './training.service';
import { CreateTrainingMaterialDto, UpdateTrainingMaterialDto } from './dto/create-training-material.dto';

@ApiTags('Admin - Training & Resources')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/training')
export class AdminTrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all training materials' })
  @ApiResponse({ status: 200, description: 'List of training materials' })
  async getAllTrainingMaterials(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.trainingService.getAllTrainingMaterials(status as any, type as any, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get training statistics' })
  @ApiResponse({ status: 200, description: 'Training statistics' })
  async getTrainingStats() {
    return this.trainingService.getTrainingStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get training material by ID' })
  @ApiResponse({ status: 200, description: 'Training material details' })
  @ApiResponse({ status: 404, description: 'Training material not found' })
  async getTrainingMaterialById(@Param('id') id: string) {
    return this.trainingService.getTrainingMaterialById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Upload/create training material' })
  @ApiResponse({ status: 201, description: 'Training material created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid training material data' })
  async createTrainingMaterial(@Body() createTrainingMaterialDto: CreateTrainingMaterialDto) {
    return this.trainingService.createTrainingMaterial(createTrainingMaterialDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update training material' })
  @ApiResponse({ status: 200, description: 'Training material updated successfully' })
  @ApiResponse({ status: 404, description: 'Training material not found' })
  async updateTrainingMaterial(
    @Param('id') id: string,
    @Body() updateTrainingMaterialDto: UpdateTrainingMaterialDto,
  ) {
    return this.trainingService.updateTrainingMaterial(id, updateTrainingMaterialDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete training material' })
  @ApiResponse({ status: 200, description: 'Training material deleted successfully' })
  @ApiResponse({ status: 404, description: 'Training material not found' })
  async deleteTrainingMaterial(@Param('id') id: string) {
    return this.trainingService.deleteTrainingMaterial(id);
  }
}
