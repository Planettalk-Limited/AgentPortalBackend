import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AgentsService } from '../modules/agents/agents.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent } from '../modules/agents/entities/agent.entity';
import { AgentEarnings, EarningStatus } from '../modules/agents/entities/agent-earnings.entity';

/**
 * Script to fix totalEarnings for all agents
 * Recalculates totalEarnings based on confirmed earnings
 */
async function fixTotalEarnings() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const agentsRepository = app.get<Repository<Agent>>(getRepositoryToken(Agent));
    const earningsRepository = app.get<Repository<AgentEarnings>>(getRepositoryToken(AgentEarnings));
    
    console.log('🔧 Starting totalEarnings fix...');
    
    // Get all agents
    const agents = await agentsRepository.find({
      relations: ['user'],
    });
    
    console.log(`📊 Found ${agents.length} agents to process`);
    
    for (const agent of agents) {
      console.log(`\n🔍 Processing agent ${agent.agentCode} (${agent.user.firstName} ${agent.user.lastName})`);
      
      // Get confirmed earnings for this agent
      const confirmedEarnings = await earningsRepository.find({
        where: {
          agentId: agent.id,
          status: EarningStatus.CONFIRMED,
        },
      });
      
      // Calculate correct totalEarnings
      const correctTotalEarnings = confirmedEarnings.reduce((sum, earning) => {
        return sum + parseFloat(earning.amount.toString());
      }, 0);
      
      console.log(`  📈 Current totalEarnings: $${agent.totalEarnings}`);
      console.log(`  📊 Confirmed earnings count: ${confirmedEarnings.length}`);
      console.log(`  💰 Calculated totalEarnings: $${correctTotalEarnings.toFixed(2)}`);
      
      // Update if different
      if (parseFloat(agent.totalEarnings.toString()) !== correctTotalEarnings) {
        const oldTotal = agent.totalEarnings;
        agent.totalEarnings = correctTotalEarnings;
        await agentsRepository.save(agent);
        
        console.log(`  ✅ Updated totalEarnings: $${oldTotal} → $${correctTotalEarnings.toFixed(2)}`);
      } else {
        console.log(`  ✅ totalEarnings already correct`);
      }
    }
    
    console.log('\n🎉 totalEarnings fix completed successfully!');
    
    // Show summary
    console.log('\n📋 Summary:');
    const updatedAgents = await agentsRepository.find({
      relations: ['user'],
    });
    
    for (const agent of updatedAgents) {
      console.log(`  ${agent.agentCode}: $${agent.totalEarnings} total, $${agent.availableBalance} available`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing totalEarnings:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the script
if (require.main === module) {
  fixTotalEarnings()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
