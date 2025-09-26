import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { UseReferralCodeDto } from './dto/use-referral-code.dto';

@ApiTags('Public - Referral Info')
@Controller('public/referral')
export class PublicReferralController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get(':agentCode')
  @ApiOperation({ summary: 'Get agent referral information and personalized message (Public)' })
  @ApiResponse({ status: 200, description: 'Agent referral information with personalized message' })
  @ApiResponse({ status: 404, description: 'Agent code not found or inactive' })
  async getReferralInfo(@Param('agentCode') agentCode: string) {
    const referralInfo = await this.agentsService.validateReferralCode(agentCode);
    
    if (!referralInfo.valid) {
      return {
        valid: false,
        message: 'This referral code is not valid or has expired.'
      };
    }

    return {
      valid: true,
      agent: {
        firstName: referralInfo.agent.firstName,
        lastName: referralInfo.agent.lastName,
        fullName: referralInfo.agent.fullName,
        agentCode: referralInfo.agent.agentCode,
        tier: referralInfo.agent.tier,
      },
      program: {
        title: "Become an Agent with PlanetTalk",
        subtitle: "Make some cash with PlanetTalk!",
        description: "Start earning commissions by bringing in new customers to PlanetTalk.",
        benefits: [
          "Receive commissions on each customer for 24 months from their first successful top-up",
          "Share your unique code with your network, they use it once and you earn commission every time they top up",
          "Help the diaspora connect and support their families back home without breaking the bank!"
        ]
      },
      personalizedMessage: referralInfo.message,
      codeDetails: {
        agentCode: agentCode,
        type: referralInfo.details.type,
        description: referralInfo.details.description,
        commissionRate: referralInfo.details.commissionRate,
        tier: referralInfo.details.tier,
        totalReferrals: referralInfo.details.totalReferrals,
        activeSince: referralInfo.details.activeSince,
      },
      callToAction: {
        primary: "Sign up with this code to get started",
        secondary: "Your agent will earn commission on every top-up you make for 24 months",
        buttonText: "Use This Code"
      }
    };
  }

  @Get(':agentCode/agent')
  @ApiOperation({ summary: 'Get just the agent info for an agent code (Public)' })
  @ApiResponse({ status: 200, description: 'Agent information' })
  async getAgentInfo(@Param('agentCode') agentCode: string) {
    const referralInfo = await this.agentsService.validateReferralCode(agentCode);
    
    if (!referralInfo.valid) {
      return { valid: false };
    }

    return {
      valid: true,
      agent: referralInfo.agent,
      message: referralInfo.message,
    };
  }

  @Post(':agentCode/use')
  @ApiOperation({ summary: 'Use agent code for airtime top-up (Public)' })
  @ApiResponse({ status: 201, description: 'Agent code used successfully, commission created' })
  @ApiResponse({ status: 400, description: 'Invalid agent code or agent not active' })
  @ApiResponse({ status: 404, description: 'Agent code not found' })
  async useAgentCode(
    @Param('agentCode') agentCode: string,
    @Body() useReferralCodeDto: UseReferralCodeDto
  ) {
    return this.agentsService.useReferralCode(agentCode, useReferralCodeDto);
  }
}
