import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent } from '../modules/agents/entities/agent.entity';

/**
 * Script to update all agents' commission rates to 10%
 * This ensures all existing agents have the correct standard commission rate
 */
async function fixCommissionRates() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const agentsRepository = app.get<Repository<Agent>>(getRepositoryToken(Agent));
    
    console.log('🔧 Starting commission rate fix...');
    console.log('📌 Target commission rate: 10%\n');
    
    // Get all agents
    const agents = await agentsRepository.find({
      relations: ['user'],
    });
    
    console.log(`📊 Found ${agents.length} agents to process\n`);
    
    let updatedCount = 0;
    let alreadyCorrectCount = 0;
    
    for (const agent of agents) {
      const agentName = agent.user 
        ? `${agent.user.firstName} ${agent.user.lastName}` 
        : 'Unknown';
      
      console.log(`🔍 Processing agent ${agent.agentCode} (${agentName})`);
      
      const currentRate = parseFloat(agent.commissionRate.toString());
      const targetRate = 10.0;
      
      console.log(`  📊 Current rate: ${currentRate}%`);
      
      // Update if different from target rate
      if (currentRate !== targetRate) {
        agent.commissionRate = targetRate;
        await agentsRepository.save(agent);
        
        console.log(`  ✅ Updated: ${currentRate}% → ${targetRate}%\n`);
        updatedCount++;
      } else {
        console.log(`  ✅ Already correct (${targetRate}%)\n`);
        alreadyCorrectCount++;
      }
    }
    
    console.log('━'.repeat(60));
    console.log('🎉 Commission rate fix completed successfully!\n');
    
    // Show summary
    console.log('📋 Summary:');
    console.log(`  • Total agents processed: ${agents.length}`);
    console.log(`  • Updated to 10%: ${updatedCount}`);
    console.log(`  • Already at 10%: ${alreadyCorrectCount}\n`);
    
    // Show all current rates
    console.log('📊 Current Commission Rates by Agent:');
    console.log('━'.repeat(60));
    
    const updatedAgents = await agentsRepository.find({
      relations: ['user'],
      order: { agentCode: 'ASC' },
    });
    
    for (const agent of updatedAgents) {
      const agentName = agent.user 
        ? `${agent.user.firstName} ${agent.user.lastName}`.padEnd(25) 
        : 'Unknown'.padEnd(25);
      
      console.log(
        `  ${agent.agentCode} | ${agentName} | ` +
        `${agent.tier.toUpperCase().padEnd(8)} | ` +
        `${agent.commissionRate}% | ` +
        `$${parseFloat(agent.totalEarnings.toString()).toFixed(2)}`
      );
    }
    
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error fixing commission rates:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the script
if (require.main === module) {
  fixCommissionRates()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { fixCommissionRates };

