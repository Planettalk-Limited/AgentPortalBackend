import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

// Agent data structure
interface AgentData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  agentCode?: string;
  country: string;
}

// Generated credentials for display
interface Credentials {
  name: string;
  email: string;
  phone: string;
  agentCode: string;
  password: string;
  role: string;
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate the next agent code based on existing codes
 */
async function getNextAgentCode(dataSource: DataSource): Promise<string> {
  const result = await dataSource.query(`
    SELECT "agentCode" FROM agents 
    WHERE "agentCode" LIKE 'PTA%' 
    ORDER BY "agentCode" DESC 
    LIMIT 1
  `);
  
  if (result.length === 0) {
    return 'PTA0002'; // Start from PTA0002 since PTA0001 is already assigned
  }
  
  const lastCode = result[0].agentCode;
  const numberPart = parseInt(lastCode.replace('PTA', ''));
  const nextNumber = numberPart + 1;
  
  return `PTA${nextNumber.toString().padStart(4, '0')}`;
}

async function seedProduction() {
  console.log('🚀 Starting production database seeding...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const allCredentials: Credentials[] = [];

  try {
    // ============================================
    // STEP 1: CLEAN UP DATABASE
    // ============================================
    console.log('🧹 Step 1: Cleaning up database...');
    
    // Delete in order of dependencies
    await dataSource.query('DELETE FROM training_completions');
    await dataSource.query('DELETE FROM training_materials');
    await dataSource.query('DELETE FROM agent_earnings');
    await dataSource.query('DELETE FROM payouts');
    await dataSource.query('DELETE FROM referral_usages');
    await dataSource.query('DELETE FROM referral_codes');
    await dataSource.query('DELETE FROM agent_applications');
    await dataSource.query('DELETE FROM agents');
    await dataSource.query('DELETE FROM notifications');
    await dataSource.query('DELETE FROM resources');
    await dataSource.query('DELETE FROM users');

    console.log('✅ All existing data cleared\n');

    // ============================================
    // STEP 2: CREATE ADMIN USER
    // ============================================
    console.log('👤 Step 2: Creating admin user...');
    
    const adminPassword = 'miraslavKlose10';
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    
    await dataSource.query(`
      INSERT INTO users (
        id, 
        "firstName", 
        "lastName", 
        email, 
        username, 
        "passwordHash", 
        role, 
        status, 
        country,
        "phoneNumber",
        "isFirstLogin", 
        "emailVerifiedAt", 
        metadata, 
        "createdAt", 
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2, 
        $3,
        $3,
        $4,
        'admin',
        'active',
        $5,
        $6,
        false,
        NOW(),
        '{"createdBy": "production-seed", "isProductionAdmin": true}',
        NOW(),
        NOW()
      )
    `, [
      'Neil',
      'Bvungidzire',
      'itsupport@planettalk.com',
      hashedAdminPassword,
      'ZA',
      '+27673988201'
    ]);

    console.log('✅ Admin user created\n');

    // Store admin credentials
    allCredentials.push({
      name: 'Neil Bvungidzire',
      email: 'itsupport@planettalk.com',
      phone: '+27673988201',
      agentCode: 'N/A (ADMIN)',
      password: adminPassword,
      role: 'ADMIN'
    });

    // ============================================
    // STEP 3: CREATE AGENTS
    // ============================================
    console.log('🏢 Step 3: Creating agent users...');

    const agentsData: AgentData[] = [
      {
        firstName: 'Shola',
        lastName: 'Olusanya',
        phone: '447395361780',
        email: 'sholaoshiyemi@gmail.com',
        agentCode: 'PTA0001',
        country: 'GB' // UK
      },
      {
        firstName: 'Semere',
        lastName: 'Gebeye',
        phone: '447377148154',
        email: 'semeregebeye@gmail.com',
        // agentCode will be auto-generated
        country: 'GB' // UK
      },
      {
        firstName: 'Haque',
        lastName: 'Haque',
        phone: '447828027963',
        email: 'mkh-786@hotmail.co.uk',
        country: 'GB' // UK
      },
      {
        firstName: 'George',
        lastName: 'Newcombe',
        phone: '447384956965',
        email: 'juniornewcombe@hotmail.com',
        country: 'GB' // UK
      },
      {
        firstName: 'Buchi',
        lastName: 'Obiji',
        phone: '447863172135',
        email: 'francesbuchi86@gmail.com',
        country: 'GB' // UK
      },
      {
        firstName: 'Oladejo',
        lastName: 'Adedayo',
        phone: '447958154276',
        email: 'saintslim@yahoo.com',
        country: 'GB' // UK
      },
      {
        firstName: 'Filmon',
        lastName: 'Abraham',
        phone: '447926324952',
        email: 'filmont39@gmail.com',
        country: 'GB' // UK
      }
    ];

    let agentCodeCounter = 2; // Start from 2 since PTA0001 is already assigned

    for (const agentData of agentsData) {
      // Generate agent code if not provided
      let agentCode = agentData.agentCode;
      if (!agentCode) {
        agentCode = `PTA${agentCodeCounter.toString().padStart(4, '0')}`;
        agentCodeCounter++;
      }

      // Generate secure random password
      const agentPassword = generateSecurePassword(12);
      const hashedAgentPassword = await bcrypt.hash(agentPassword, 10);

      // Format phone number with +
      const formattedPhone = agentData.phone.startsWith('+') ? agentData.phone : `+${agentData.phone}`;

      // Create user
      const userResult = await dataSource.query(`
        INSERT INTO users (
          id, 
          "firstName", 
          "lastName", 
          email, 
          username, 
          "passwordHash", 
          role, 
          status, 
          country,
          "phoneNumber",
          "isFirstLogin", 
          "emailVerifiedAt", 
          metadata, 
          "createdAt", 
          "updatedAt"
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2, 
          $3,
          $3,
          $4,
          'agent',
          'active',
          $5,
          $6,
          false,
          NOW(),
          '{"createdBy": "production-seed", "isProductionAgent": true, "emailVerifiedByAdmin": true}',
          NOW(),
          NOW()
        )
        RETURNING id
      `, [
        agentData.firstName,
        agentData.lastName,
        agentData.email,
        hashedAgentPassword,
        agentData.country,
        formattedPhone
      ]);

      const userId = userResult[0].id;

      // Create agent profile
      await dataSource.query(`
        INSERT INTO agents (
          id,
          "agentCode",
          "userId",
          status,
          tier,
          "totalEarnings",
          "availableBalance",
          "pendingBalance",
          "totalReferrals",
          "activeReferrals",
          "commissionRate",
          "activatedAt",
          "lastActivityAt",
          metadata,
          "createdAt",
          "updatedAt"
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          'active',
          'bronze',
          0,
          0,
          0,
          0,
          0,
          10.00,
          NOW(),
          NOW(),
          '{"createdBy": "production-seed", "adminVerified": true, "autoActivated": true}',
          NOW(),
          NOW()
        )
      `, [agentCode, userId]);

      // Create a standard referral code for the agent
      await dataSource.query(`
        INSERT INTO referral_codes (
          id,
          "agentId",
          code,
          type,
          description,
          status,
          "currentUses",
          metadata,
          "createdAt",
          "updatedAt"
        )
        SELECT 
          gen_random_uuid(),
          a.id,
          $1::varchar,
          'standard',
          'Personal referral code for ' || $2,
          'active',
          0,
          '{"createdBy": "production-seed"}',
          NOW(),
          NOW()
        FROM agents a
        WHERE a."agentCode" = $1::varchar
      `, [agentCode, `${agentData.firstName} ${agentData.lastName}`]);

      console.log(`   ✓ Created agent: ${agentData.firstName} ${agentData.lastName} (${agentCode})`);

      // Store credentials
      allCredentials.push({
        name: `${agentData.firstName} ${agentData.lastName}`,
        email: agentData.email,
        phone: formattedPhone,
        agentCode: agentCode,
        password: agentPassword,
        role: 'AGENT'
      });
    }

    console.log('\n✅ All agents created successfully!\n');

    // ============================================
    // STEP 4: DISPLAY CREDENTIALS
    // ============================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 PRODUCTION DATABASE SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('🔑 LOGIN CREDENTIALS - SHARE WITH USERS\n');
    console.log('─────────────────────────────────────────────────────────────\n');

    // Display admin credentials
    console.log('👤 ADMINISTRATOR:\n');
    const adminCred = allCredentials.find(c => c.role === 'ADMIN');
    if (adminCred) {
      console.log(`   Name:     ${adminCred.name}`);
      console.log(`   Email:    ${adminCred.email}`);
      console.log(`   Phone:    ${adminCred.phone}`);
      console.log(`   Password: ${adminCred.password}`);
      console.log(`   Role:     ${adminCred.role}\n`);
    }

    console.log('─────────────────────────────────────────────────────────────\n');

    // Display agent credentials
    console.log('🏢 AGENTS:\n');
    const agentCreds = allCredentials.filter(c => c.role === 'AGENT');
    agentCreds.forEach((cred, index) => {
      console.log(`   ${index + 1}. ${cred.name}`);
      console.log(`      Email:      ${cred.email}`);
      console.log(`      Phone:      ${cred.phone}`);
      console.log(`      Agent Code: ${cred.agentCode}`);
      console.log(`      Password:   ${cred.password}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 CREDENTIALS SUMMARY (Copy & Paste Format)\n');
    console.log('─────────────────────────────────────────────────────────────\n');
    
    allCredentials.forEach(cred => {
      console.log(`${cred.name} (${cred.role})`);
      console.log(`Email: ${cred.email}`);
      console.log(`Password: ${cred.password}`);
      if (cred.role === 'AGENT') {
        console.log(`Agent Code: ${cred.agentCode}`);
      }
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 DATABASE STATISTICS:\n');
    
    const userCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
    const agentCount = await dataSource.query('SELECT COUNT(*) as count FROM agents');
    const codeCount = await dataSource.query('SELECT COUNT(*) as count FROM referral_codes');
    
    console.log(`   Total Users:         ${userCount[0].count}`);
    console.log(`   Total Agents:        ${agentCount[0].count}`);
    console.log(`   Referral Codes:      ${codeCount[0].count}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 System is ready for production use!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seedProduction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });

