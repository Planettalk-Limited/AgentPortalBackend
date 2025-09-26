# Agent Portal Backend

A comprehensive NestJS backend API for managing insurance agents, referral codes, and commission tracking.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd AgentPortalBackend
   npm install
   ```

2. **Database Setup (One Command)**
   ```bash
   npm run setup
   ```
   This will:
   - Create `.env` file if it doesn't exist
   - Create the PostgreSQL database
   - Run all migrations

3. **Start Development Server**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000`

## 📋 Available Scripts

### Development
- `npm run start:dev` - Start in watch mode
- `npm run start:debug` - Start with debugging
- `npm run build` - Build for production
- `npm run start:prod` - Start production build

### Database Management
- `npm run setup` - Complete database setup (recommended for new developers)
- `npm run db:create` - Create database
- `npm run db:drop` - Drop database ⚠️
- `npm run db:reset` - Reset database ⚠️
- `npm run migration:generate <name>` - Generate migration
- `npm run migration:run` - Run migrations
- `npm run migration:revert` - Revert last migration

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format` - Format with Prettier
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run e2e tests

## 🗄️ Database Schema

The system manages:

- **Users & Agents**: Role-based user management with agent-specific data
- **Referral Codes**: Trackable referral system with usage analytics
- **Earnings**: Commission tracking and payment management
- **Applications**: Agent onboarding workflow

See [Database Setup Guide](docs/DATABASE_SETUP.md) for detailed information.

## 📖 API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **API JSON**: `http://localhost:3000/api/docs-json`

## 🏗️ Project Structure

```
src/
├── config/           # Configuration files
├── modules/          # Feature modules
│   ├── agents/       # Agent management
│   ├── auth/         # Authentication
│   └── users/        # User management
├── migrations/       # Database migrations
└── main.ts          # Application entry point
```

## 🔧 Configuration

Key environment variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=agent_portal

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=development
PORT=3000
```

## 🚦 Agent Onboarding Flow

1. **Application Submission** - Agent submits onboarding form
2. **Review Process** - PT Admin reviews and approves
3. **Code Generation** - System generates unique agent code
4. **Credential Delivery** - Login credentials sent via email
5. **First Login** - Agent activates account
6. **Active Status** - Agent can create referral codes and earn commissions

## 💰 Referral & Earnings System

- **Referral Codes**: Agents can create multiple codes with different types
- **Usage Tracking**: Real-time tracking of code usage and conversions
- **Commission Calculation**: Automatic commission calculation based on agent tier
- **Payment Processing**: Complete earnings lifecycle management

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests  
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📚 Documentation

- [Database Setup Guide](docs/DATABASE_SETUP.md)
- [Agent Onboarding Model](docs/AGENT_ONBOARDING_MODEL.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is private and proprietary.