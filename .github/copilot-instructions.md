# Copilot Instructions - trans-shcheduler

## Project Architecture

This is a **full-stack API Platform application** with three main components:
- **API (Backend)**: Symfony 7.2 + API Platform 4 + Doctrine ORM + MySQL 8.0 (PHP 8.4, FrankenPHP runtime)
- **PWA (Frontend)**: Next.js 15 + React 19 + TypeScript + API Platform Admin
- **E2E Tests**: Playwright for end-to-end testing

All services run in **Docker containers** via `compose.yaml`. The API serves both REST/GraphQL APIs and the PWA frontend through FrankenPHP/Caddy with Mercure support for real-time updates.

## Critical Developer Workflows

### Running Commands Inside Containers
**Always** run PHP/Symfony commands inside the `php` container:
```bash
docker compose exec -T php bin/console <command>
docker compose exec php php bin/console <command>
```

Use VS Code tasks (already configured) for common operations:
- **Clear Cache**: `Symfony: Clear Cache (dev)`
- **Make Migration**: `Symfony: Make Migration` → `docker-compose exec php php bin/console doctrine:migrations:diff`
- **Run Migrations**: `Symfony: Run Migrations` → `docker-compose exec php php bin/console doctrine:migrations:migrate --no-interaction`

### Database Workflow
1. Modify entity in `api/src/Entity/`
2. Generate migration: `docker-compose exec php php bin/console doctrine:migrations:diff`
3. Review migration in `api/migrations/`
4. Apply: `docker-compose exec php php bin/console doctrine:migrations:migrate --no-interaction`
5. Validate: `docker compose exec -T php bin/console doctrine:schema:validate`

### Testing
Run PHPUnit tests inside container:
```bash
docker compose exec -T php bin/console -e test doctrine:database:create
docker compose exec -T php bin/console -e test doctrine:migrations:migrate --no-interaction
docker compose exec -T php bin/phpunit
```

## Project-Specific Conventions

### Bulgarian Language Entities
All entity properties, API descriptions, and validation messages are **in Bulgarian**:
```php
#[Assert\NotBlank(message: 'Първото име е задължително')]
#[ApiProperty(description: 'Първо име', example: 'Иван')]
private ?string $first_name = null;
```

### Entity Patterns
- **API Platform Attributes**: Use `#[ApiResource()]` with `mercure: true` for real-time updates
- **Serialization Groups**: `normalizationContext: ['groups' => ['entity:read']]` and `denormalizationContext: ['groups' => ['entity:write']]`
- **Validation**: Bulgarian messages using Symfony validators
- **Naming**: Snake_case for properties (`first_name`, `middle_name`, `last_name`)

Example from `Employees.php`:
```php
#[ApiResource(
    description: 'Служители в компанията',
    mercure: true,
    normalizationContext: ['groups' => ['employee:read']], 
    denormalizationContext: ['groups' => ['employee:write']],
    paginationItemsPerPage: 30
)]
```

### Enums
Use PHP 8.4 backed enums with **Bulgarian values**:
```php
enum Status: string {
    case IsActive = 'активен';
    case NotActive = 'неактивен';
    case IsLeave = 'напуснал';
}
```

### State Processors
Custom logic for API operations goes in `api/src/State/` (e.g., `UserPasswordHasher.php` for password hashing before persistence).

### Authentication Flow
- **Backend**: JWT authentication via `lexik/jwt-authentication-bundle`
- **Endpoint**: `POST /auth` with `{username, password}` returns JWT token
- **Frontend**: Token stored in localStorage via `pwa/jwt-frontend-auth/src/auth/authService.ts`
- **Admin**: API Platform Admin (`pwa/components/admin/`) uses custom `authProvider.tsx`

Security config in `api/config/packages/security.yaml`:
- `/auth`, `/docs`, `/admin` are `PUBLIC_ACCESS`
- All other routes require JWT authentication

## Key Directories & Files

### Backend (api/)
- `src/Entity/` - Doctrine entities with API Platform attributes (User, Employees, Positions)
- `src/State/` - Custom state processors for API operations
- `src/Enum/` - Backed enums (Status, etc.)
- `src/Repository/` - Doctrine repositories
- `migrations/` - Doctrine migrations (manual review required)
- `config/packages/` - Symfony bundle configs (api_platform.yaml, security.yaml, doctrine.yaml)

### Frontend (pwa/)
- `components/admin/` - API Platform Admin customizations (App.tsx, authProvider.tsx, employees/)
- `jwt-frontend-auth/` - Reusable JWT auth module
- `pages/admin/` - Admin interface routes
- `pages/_app.tsx` - Next.js app wrapper with global layout

### Infrastructure
- `compose.yaml` - Docker services (php, pwa, database=MySQL 8.0)
- `api/Dockerfile` - FrankenPHP-based PHP image
- `api/frankenphp/Caddyfile` - Caddy server config with Mercure

## Integration Points

### API ↔ PWA Communication
- PWA connects to API via `window.origin` (same-origin deployment)
- API Platform Admin auto-discovers resources from API's OpenAPI/Hydra metadata
- Real-time updates via Mercure (`MERCURE_URL` configured in compose.yaml)

### Database
MySQL 8.0 on port 3307 (host), 3306 (container):
```yaml
DATABASE_URL: mysql://api-platform:123456@database:3306/api?serverVersion=8.0
```

## Don't Do This
- ❌ Don't run migrations without reviewing them first
- ❌ Don't use generic English messages in entities (use Bulgarian)
- ❌ Don't forget `mercure: true` on ApiResource for real-time features
- ❌ Don't run Symfony commands on host (always use `docker compose exec php`)
- ❌ Don't use camelCase for entity properties (use snake_case)

## Do This
- ✅ Add validation messages in Bulgarian with examples
- ✅ Use serialization groups (`employee:read`, `employee:write`) consistently
- ✅ Include Bulgarian phone regex for Bulgarian phone numbers: `/^(?:\+359|0)8[789]\d{7}$/`
- ✅ Set pagination defaults in ApiResource (`paginationItemsPerPage: 30`)
- ✅ Clear cache after config changes: `docker compose exec -T php php bin/console cache:clear`
