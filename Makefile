# Agent Portal Backend - Makefile
# Use this Makefile to manage development and production environments

.PHONY: help dev-up dev-down dev-logs dev-build dev-clean prod-up prod-down prod-logs prod-build prod-clean setup-traefik docker-build docker-push migration-run migration-create clean-all

# Default target
help: ## Show this help message
	@echo "Agent Portal Backend - Available Commands:"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev-up          - Start development environment"
	@echo "  dev-down        - Stop development environment"
	@echo "  dev-logs        - Show development logs"
	@echo "  dev-build       - Build development containers"
	@echo "  dev-clean       - Clean development containers and volumes"
	@echo "  dev-restart     - Restart development environment"
	@echo ""
	@echo "Production Commands:"
	@echo "  prod-up         - Start production environment"
	@echo "  prod-down       - Stop production environment"
	@echo "  prod-logs       - Show production logs"
	@echo "  prod-build      - Build production containers"
	@echo "  prod-clean      - Clean production containers and volumes"
	@echo "  prod-restart    - Restart production environment"
	@echo ""
	@echo "Docker Commands:"
	@echo "  docker-build    - Build Docker image"
	@echo "  docker-push     - Push Docker image to registry"
	@echo ""
	@echo "Database Commands:"
	@echo "  migration-run   - Run database migrations"
	@echo "  migration-create - Create new migration"
	@echo ""
	@echo "Utility Commands:"
	@echo "  setup-traefik   - Setup Traefik network for production"
	@echo "  clean-all       - Clean all containers, volumes, and images"
	@echo ""

# Development Environment Commands
dev-up: ## Start development environment
	@echo "🚀 Starting development environment..."
	docker-compose --profile dev up -d
	@echo "✅ Development environment started!"
	@echo "📱 API: http://localhost:3000/api/v1"
	@echo "📚 Docs: http://localhost:3000/api/v1/docs"
	@echo "🗄️  pgAdmin: http://localhost:8080"

dev-down: ## Stop development environment
	@echo "🛑 Stopping development environment..."
	docker-compose --profile dev down
	@echo "✅ Development environment stopped!"

dev-logs: ## Show development logs
	docker-compose --profile dev logs -f

dev-build: ## Build development containers
	@echo "🔨 Building development containers..."
	docker-compose --profile dev build --no-cache
	@echo "✅ Development containers built!"

dev-clean: ## Clean development containers and volumes
	@echo "🧹 Cleaning development environment..."
	docker-compose --profile dev down -v --remove-orphans
	docker-compose --profile dev rm -f
	@echo "✅ Development environment cleaned!"

dev-restart: dev-down dev-up ## Restart development environment

# Production Environment Commands
prod-up: ## Start production environment
	@echo "🚀 Starting production environment..."
	@if [ ! -f .env.prod ]; then \
		echo "❌ Error: .env.prod file not found!"; \
		echo "Please create .env.prod with production environment variables."; \
		exit 1; \
	fi
	@echo "🔨 Building production image..."
	docker-compose --env-file .env.prod --profile prod build
	@echo "🚀 Starting containers..."
	docker-compose --env-file .env.prod --profile prod up -d
	@echo "✅ Production environment started!"
	@echo "🌐 API available at: https://api.planettalk.com"

prod-down: ## Stop production environment
	@echo "🛑 Stopping production environment..."
	docker-compose --profile prod down
	@echo "✅ Production environment stopped!"

prod-logs: ## Show production logs
	docker-compose --profile prod logs -f

prod-build: ## Build production containers
	@echo "🔨 Building production containers..."
	docker-compose --profile prod build --no-cache
	@echo "✅ Production containers built!"

prod-clean: ## Clean production containers and volumes
	@echo "🧹 Cleaning production environment..."
	docker-compose --profile prod down -v --remove-orphans
	docker-compose --profile prod rm -f
	@echo "✅ Production environment cleaned!"

prod-restart: prod-down prod-up ## Restart production environment

# Docker Commands
docker-build: ## Build Docker image
	@echo "🔨 Building Docker image..."
	docker build -t planettalk/agent-portal-backend:latest .
	docker build -t planettalk/agent-portal-backend:$$(date +%Y%m%d-%H%M%S) .
	@echo "✅ Docker image built!"

docker-push: ## Push Docker image to registry
	@echo "📤 Pushing Docker image to registry..."
	docker push planettalk/agent-portal-backend:latest
	@echo "✅ Docker image pushed!"

# Database Commands
migration-run: ## Run database migrations
	@echo "🗄️  Running database migrations..."
	@if docker ps | grep -q agent-backend-prod; then \
		docker exec agent-backend-prod npm run migration:run:prod; \
	elif docker ps | grep -q agent-backend-dev; then \
		docker exec agent-backend-dev npm run migration:run; \
	else \
		echo "❌ No running backend container found. Start the environment first."; \
		exit 1; \
	fi
	@echo "✅ Database migrations completed!"

migration-create: ## Create new migration (requires NAME variable)
	@if [ -z "$(NAME)" ]; then \
		echo "❌ Error: NAME variable is required"; \
		echo "Usage: make migration-create NAME=YourMigrationName"; \
		exit 1; \
	fi
	@echo "📝 Creating new migration: $(NAME)..."
	npm run migration:create src/migrations/$(shell date +%s)-$(NAME)
	@echo "✅ Migration created!"

# Utility Commands
setup-traefik: ## Setup Traefik network for production
	@echo "🔧 Setting up Traefik network..."
	@if ! docker network ls | grep -q " web "; then \
		docker network create web; \
		echo "✅ Traefik 'web' network created!"; \
	else \
		echo "ℹ️  Traefik 'web' network already exists."; \
	fi

clean-all: ## Clean all containers, volumes, and images
	@echo "🧹 Cleaning all Docker resources..."
	@read -p "⚠️  This will remove ALL containers, volumes, and images. Continue? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose --profile dev down -v --remove-orphans --rmi all; \
		docker-compose --profile prod down -v --remove-orphans --rmi all; \
		docker system prune -af --volumes; \
		echo "✅ All Docker resources cleaned!"; \
	else \
		echo "❌ Operation cancelled."; \
	fi

# Health Check Commands
health-check: ## Check health of running services
	@echo "🏥 Checking service health..."
	@if docker ps | grep -q agent-backend-prod; then \
		echo "Production Backend:"; \
		docker exec agent-backend-prod wget --spider -q http://localhost:3000/api/v1/health && echo "✅ Healthy" || echo "❌ Unhealthy"; \
	fi
	@if docker ps | grep -q agent-backend-dev; then \
		echo "Development Backend:"; \
		docker exec agent-backend-dev wget --spider -q http://localhost:3000/api/v1/health && echo "✅ Healthy" || echo "❌ Unhealthy"; \
	fi
	@if docker ps | grep -q agent-portal-postgres; then \
		echo "PostgreSQL:"; \
		docker exec agent-portal-postgres pg_isready -U postgres && echo "✅ Healthy" || echo "❌ Unhealthy"; \
	fi
	@if docker ps | grep -q agent-portal-redis; then \
		echo "Redis:"; \
		docker exec agent-portal-redis redis-cli ping && echo "✅ Healthy" || echo "❌ Unhealthy"; \
	fi

# Development specific commands
dev-shell: ## Open shell in development backend container
	@if docker ps | grep -q agent-backend-dev; then \
		docker exec -it agent-backend-dev sh; \
	else \
		echo "❌ Development backend container not running. Start with 'make dev-up'"; \
	fi

dev-db-shell: ## Open PostgreSQL shell in development environment
	@if docker ps | grep -q agent-portal-postgres; then \
		docker exec -it agent-portal-postgres psql -U postgres -d agent_portal; \
	else \
		echo "❌ Database container not running. Start with 'make dev-up' or 'make prod-up'"; \
	fi

# Show running containers
status: ## Show status of all containers
	@echo "📊 Container Status:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(agent-portal-|agent-backend)" || echo "No containers running"
