# Testing Setup

## Database Cleanup & Reset

To reset the database for clean testing:

```bash
npm run db:reset-for-testing
```

This will:
- 🗑️ Delete all agents, users, and related data
- 👤 Create 2 admin users for testing

## Login Credentials

After running the cleanup script, you can login with:

### System Admin
- **Email:** `admin@planettalk.com`
- **Password:** `admin123!`
- **Role:** ADMIN
- **Access:** Full system administration

### PlanetTalk Admin  
- **Email:** `ptadmin@planettalk.com`
- **Password:** `ptadmin123!`
- **Role:** PT_ADMIN
- **Access:** Agent management and approvals

## Testing the Registration Flow

1. **Reset database:** `npm run db:reset-for-testing`
2. **Start server:** `npm run start:dev`
3. **Test registration via frontend:**
   - Register new users via `/auth/register`
   - Check email template rendering
   - Test first-login auto-approval
   - Verify referral data creation

## Expected Flow

1. **Registration:** User creates account → status: `PENDING`
2. **Email sent:** Welcome email with login details
3. **First login:** Auto-approves user → status: `ACTIVE`
4. **Referral data:** Complete structure returned on first login
5. **Agent profile:** Active with 15% commission, bronze tier

## Manual Cleanup (Alternative)

If you need to run the cleanup script directly:

```bash
npx ts-node src/scripts/cleanup-simple.ts
```
