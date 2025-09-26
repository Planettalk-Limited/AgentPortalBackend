import {
  Controller,
  Post,
  Get,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentApplicationDto } from './dto/create-agent-application.dto';

@ApiTags('Agent Applications (Public)')
@Controller('public/agents')
export class PublicAgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Submit agent application (public)' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid application data' })
  async submitApplication(@Body() createApplicationDto: CreateAgentApplicationDto) {
    return this.agentsService.submitApplication(createApplicationDto);
  }

  @Get('referral-codes/:code/validate')
  @ApiOperation({ summary: 'Validate referral code (public)' })
  @ApiResponse({ status: 200, description: 'Referral code is valid' })
  @ApiResponse({ status: 404, description: 'Referral code not found or invalid' })
  async validateReferralCode(@Param('code') code: string) {
    return this.agentsService.validateReferralCode(code);
  }
}
