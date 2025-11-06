# Production Database Seed

## Commands

### Docker/Production
```bash
make setup-production
```

### Local Development
```bash
npm run seed:production
```

### Production Server (Built)
```bash
npm run seed:production:prod
```

## What It Does

1. Deletes all data from database
2. Creates admin user and 7 agents
3. Displays all credentials in console

## Admin Account

- Name: Neil Bvungidzire
- Email: itsupport@planettalk.com
- Phone: +27673988201
- Country: South Africa (ZA)
- Password: miraslavKlose10
- Role: ADMIN

## Agent Accounts

| Code | Name | Email | Phone |
|------|------|-------|-------|
| PTA0001 | Shola Olusanya | sholaoshiyemi@gmail.com | +447395361780 |
| PTA0002 | Semere Gebeye | semeregebeye@gmail.com | +447377148154 |
| PTA0003 | Haque Haque | mkh-786@hotmail.co.uk | +447828027963 |
| PTA0004 | George Newcombe | juniornewcombe@hotmail.com | +447384956965 |
| PTA0005 | Buchi Obiji | francesbuchi86@gmail.com | +447863172135 |
| PTA0006 | Oladejo Adedayo | saintslim@yahoo.com | +447958154276 |
| PTA0007 | Filmon Abraham | filmont39@gmail.com | +447926324952 |

Passwords are auto-generated (12 chars, secure) and displayed when script runs.

## Agent Code Format

All agent codes now use **PTA** pattern:
- Format: `PTA####` (e.g., PTA0001, PTA0002)
- Updated in: `src/modules/agents/agents.service.ts` and `src/database/seeders/planettalk.seeder.ts`
- Applies to all new agents created in the system

## Files Modified

- `src/scripts/seed-production.ts` - Production seed script
- `Makefile` - Added `setup-production` command
- `package.json` - Added npm scripts
- `src/modules/agents/agents.service.ts` - Agent code generator (AGT → PTA)
- `src/database/seeders/planettalk.seeder.ts` - Seeder code generator (AGT → PTA)

## Script Location

`src/scripts/seed-production.ts`

