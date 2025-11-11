# Agent Code Assignment - Automatic Sequential Assignment

## Overview

Agent codes are **automatically assigned** when an agent is created. The system uses sequential assignment within the range **PTA0001 to PTA0205** and automatically checks for duplicates.

## How It Works

### Automatic Assignment
When a new agent is created, the system:

1. ✅ Queries all existing agent codes in the range (PTA0001-PTA0205)
2. ✅ Finds the **first available code** sequentially
3. ✅ Assigns it to the new agent
4. ✅ Throws an error if all 205 codes are exhausted

### Code Format
- **Prefix**: `PTA`
- **Range**: `0001` to `0205`
- **Format**: 4-digit number with leading zeros
- **Examples**: `PTA0001`, `PTA0002`, `PTA0100`, `PTA0205`

## Implementation

### Agent Service

The `generateAgentCode()` method in `AgentsService` handles automatic assignment:

```typescript:656:688:src/modules/agents/agents.service.ts
private async generateAgentCode(): Promise<string> {
  const prefix = 'PTA';
  const minCode = 1;
  const maxCode = 205;

  // Get all existing agent codes in the range PTA0001-PTA0205
  const existingAgents = await this.agentsRepository
    .createQueryBuilder('agent')
    .select('agent.agentCode')
    .where('agent.agentCode LIKE :prefix', { prefix: `${prefix}%` })
    .andWhere(`CAST(SUBSTRING(agent.agentCode FROM 4) AS INTEGER) BETWEEN :min AND :max`, { 
      min: minCode, 
      max: maxCode 
    })
    .getMany();

  // Create a set of existing codes for fast lookup
  const existingCodes = new Set(existingAgents.map(agent => agent.agentCode));

  // Find the first available code in the range
  for (let i = minCode; i <= maxCode; i++) {
    const agentCode = `${prefix}${i.toString().padStart(4, '0')}`;
    
    if (!existingCodes.has(agentCode)) {
      return agentCode;
    }
  }

  // If we get here, all codes in the range are used
  throw new BadRequestException(
    `All agent codes in the range ${prefix}${minCode.toString().padStart(4, '0')} to ${prefix}${maxCode.toString().padStart(4, '0')} have been assigned. Please contact system administrator.`
  );
}
```

### Where It's Used

The automatic assignment happens when:

1. **Agent Registration** - New agent signs up
2. **Manual Agent Creation** - Admin creates an agent
3. **Seed Scripts** - Database seeding

## Validation Rules

### ✅ Duplicate Prevention
- Queries existing codes before assignment
- Uses unique constraint on `agentCode` column
- Database-level uniqueness enforced

### ✅ Range Enforcement
- Only assigns codes between PTA0001 and PTA0205
- Sequential assignment (no random gaps)
- Clear error message when range is exhausted

### ✅ Format Validation
- Always uses 4-digit format with leading zeros
- Prefix is always "PTA"
- Example: PTA0001, not PTA1 or PTA00001

## Error Handling

### All Codes Exhausted

If all 205 codes have been assigned, the system throws:

```
BadRequestException: All agent codes in the range PTA0001 to PTA0205 have been assigned. Please contact system administrator.
```

**Solution**: Extend the range in the code:

```typescript
const maxCode = 500; // Increase from 205 to 500
```

## Database Schema

```typescript:43:44:src/modules/agents/entities/agent.entity.ts
@Column({ type: 'varchar', length: 20, unique: true })
agentCode: string;
```

The `agentCode` field:
- ✅ Unique constraint at database level
- ✅ Indexed for fast lookups
- ✅ Required field (cannot be null)

## Example Usage

### Creating an Agent (Automatic Code Assignment)

```typescript
// The agent code is automatically assigned
const agent = await agentsService.createAgentWithReferralData(user);

console.log(agent.agentCode); // Output: PTA0001 (or next available)
```

### No Manual Code Assignment Needed

You don't need to:
- ❌ Generate codes manually
- ❌ Check for duplicates manually
- ❌ Track the next available code

The system handles everything automatically!

## Monitoring

### Check How Many Codes Are Left

```sql
-- Count assigned codes
SELECT COUNT(*) as assigned_codes 
FROM agents 
WHERE "agentCode" ~ '^PTA0{0,3}[0-9]{1,4}$'
  AND CAST(SUBSTRING("agentCode" FROM 4) AS INTEGER) BETWEEN 1 AND 205;

-- Count available codes
SELECT 205 - COUNT(*) as available_codes 
FROM agents 
WHERE "agentCode" ~ '^PTA0{0,3}[0-9]{1,4}$'
  AND CAST(SUBSTRING("agentCode" FROM 4) AS INTEGER) BETWEEN 1 AND 205;
```

### View Assigned Codes

```sql
SELECT "agentCode", "createdAt"
FROM agents
WHERE "agentCode" LIKE 'PTA%'
  AND CAST(SUBSTRING("agentCode" FROM 4) AS INTEGER) BETWEEN 1 AND 205
ORDER BY "agentCode";
```

## Performance

- **Fast lookup**: Uses Set data structure for O(1) lookup
- **Single query**: Fetches all codes in one database call
- **Indexed**: `agentCode` column is indexed for quick searches

## Extending the Range

To support more than 205 agents, update the `maxCode` constant:

### In AgentsService

```typescript
// src/modules/agents/agents.service.ts
const maxCode = 500; // Change from 205 to 500
```

### In PlanetTalk Seeder

```typescript
// src/database/seeders/planettalk.seeder.ts
const maxCode = 500; // Change from 205 to 500
```

## Testing

### Test Automatic Assignment

```typescript
// Create multiple agents and verify sequential codes
const agent1 = await agentsService.createAgentWithReferralData(user1);
const agent2 = await agentsService.createAgentWithReferralData(user2);
const agent3 = await agentsService.createAgentWithReferralData(user3);

console.log(agent1.agentCode); // PTA0001
console.log(agent2.agentCode); // PTA0002
console.log(agent3.agentCode); // PTA0003
```

### Test Duplicate Prevention

```typescript
// The system automatically skips already assigned codes
// If PTA0001-PTA0005 exist, the next agent gets PTA0006
```

### Test Range Exhaustion

```typescript
// When all 205 codes are used, this throws an error
try {
  await agentsService.createAgentWithReferralData(user);
} catch (error) {
  console.error(error.message); 
  // "All agent codes in the range PTA0001 to PTA0205 have been assigned..."
}
```

## Related Files

- **Service**: `src/modules/agents/agents.service.ts` (lines 656-688)
- **Seeder**: `src/database/seeders/planettalk.seeder.ts` (lines 497-529)
- **Entity**: `src/modules/agents/entities/agent.entity.ts`

## Summary

✅ **Automatic**: No manual code generation needed  
✅ **Sequential**: Codes assigned in order (001, 002, 003...)  
✅ **No Duplicates**: Checks existing codes before assignment  
✅ **Range Validated**: Only assigns codes between 0001-0205  
✅ **Error Handling**: Clear message when all codes are used  
✅ **Performance**: Fast lookup using Set data structure  

The system handles everything automatically when agents are created!

