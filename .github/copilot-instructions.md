# Copilot Instructions - trans-scheduler

## Project Architecture

This is a **full-stack API Platform application** with three main components:
- **API (Backend)**: Symfony 7.2 + API Platform 4 + Doctrine ORM + MySQL 8.0 (PHP 8.4, FrankenPHP runtime)
- **PWA (Frontend)**: Next.js 15 + React 19 + TypeScript + API Platform Admin (React Admin 5)
- **E2E Tests**: Playwright for end-to-end testing

All services run in **Docker containers** via `compose.yaml`. FrankenPHP serves the API on ports 80/443 with Mercure for real-time updates. MySQL runs on port 3307 (host)/3306 (container).

## Critical Developer Workflows

### Running Commands Inside Containers
**Always** run PHP/Symfony commands inside the `php` container:
```bash
docker compose exec -T php bin/console <command>
docker compose exec php php bin/console <command>
```

Use VS Code tasks (already configured) for common operations:
- **Clear Cache**: `Symfony: Clear Cache (dev)`
- **Make Migration**: `Symfony: Make Migration` → `docker compose exec php php bin/console doctrine:migrations:diff`
- **Run Migrations**: `Symfony: Run Migrations` → `docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction`

### Database Workflow
1. Modify entity in `api/src/Entity/`
2. Generate migration: `docker compose exec php php bin/console doctrine:migrations:diff`
3. Review migration in `api/migrations/`
4. Apply: `docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction`
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
- **Pagination**: Set in `#[ApiResource()]` with `paginationItemsPerPage: 30, paginationClientEnabled: true`
- **Lifecycle Callbacks**: Use `#[ORM\HasLifecycleCallbacks]` for automatic created_at/updated_at timestamps

Example from `Employees.php`:
```php
#[ApiResource(
    description: 'Служители в компанията',
    mercure: true,
    normalizationContext: ['groups' => ['employee:read']], 
    denormalizationContext: ['groups' => ['employee:write']],
    paginationItemsPerPage: 30
)]
#[ApiFilter(SearchFilter::class, properties: ['first_name' => 'partial', 'status' => 'exact'])]
#[ApiFilter(OrderFilter::class, properties: ['first_name', 'created_at'])]
#[ORM\HasLifecycleCallbacks]
class Employees { ... }
```

### API Filters & Search
Entities use `SearchFilter` and `OrderFilter` for filtering/sorting:
```php
#[ApiFilter(
    SearchFilter::class, 
    properties: [
        'first_name' => 'partial',    // LIKE %value%
        'status' => 'exact',           // Exact match
        'position' => 'exact'          // Relation filter
    ]
)]
#[ApiFilter(
    OrderFilter::class, 
    properties: ['first_name', 'created_at'],
    arguments: ['orderParameterName' => 'order']
)]
```
- Use `'partial'` for text search (case-insensitive)
- Use `'exact'` for enums, IDs, and relations
- `OrderFilter` enables sorting: `?order[first_name]=asc`

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

Attach processors to specific operations in the entity:
```php
#[ApiResource(
    operations: [
        new Post(processor: UserPasswordHasher::class),
        new Put(processor: UserPasswordHasher::class),
        new Patch(processor: UserPasswordHasher::class),
    ]
)]
class User { ... }
```

State processors implement `ProcessorInterface` and receive the decorated persistence processor:
```php
final readonly class UserPasswordHasher implements ProcessorInterface
{
    public function __construct(
        private ProcessorInterface $processor,  // Decorated processor
        private UserPasswordHasherInterface $passwordHasher
    ) { }
    
    public function process(mixed $data, Operation $operation, ...): User
    {
        // Custom logic before persistence
        if ($data->getPlainPassword()) {
            $hashedPassword = $this->passwordHasher->hashPassword(...);
            $data->setPassword($hashedPassword);
        }
        // Call decorated processor to persist
        return $this->processor->process($data, $operation, ...);
    }
}
```

### Services
Complex business logic goes in `api/src/Service/`:
- `CalendarService.php` - Calendar generation logic
- `MatrixGenerator.php` - Matrix generation algorithms

Use services in State Processors or custom Controllers for non-CRUD operations.

### Authentication Flow
- **Backend**: JWT authentication via `lexik/jwt-authentication-bundle`
- **Endpoint**: `POST /auth` with `{username, password}` returns JWT token
- **Frontend**: Token stored in localStorage via `pwa/jwt-frontend-auth/src/auth/authService.ts`
- **Admin**: API Platform Admin (`pwa/components/admin/`) uses custom `authProvider.ts`

### Frontend API Path Rule (Important)
When using `api` client calls from resource-scoped admin forms (for example users edit/create flows), avoid adding the resource prefix if the request is already executed in a resource context.

- ✅ Correct pattern with id only: `await api.patch(`${data.id}`, payload)`
- ❌ Avoid prefixed duplicate path: `await api.patch(`/users/${data.id}`, payload)`

Reason: in these contexts, API Platform already resolves the resource IRI base (for example `/users`) from the active resource route. Appending another `/users/` manually duplicates the IRI path and can produce URLs like `/users//users/{id}`.

IRI note: in API Platform the canonical identifier for a concrete record is its IRI (for example `/users/123`). In resource-scoped admin requests, pass only the trailing identifier segment (`${data.id}`), because the resource prefix is already part of the active request context.

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

#### Frontend Component Structure
Each resource has its own directory with standard components (all with Bulgarian labels):
```
components/admin/employees/
  ├── employeesList.tsx       # List view with DatagridConfigurable
  ├── employeesCreate.tsx     # Create form
  ├── EmployeesEdit.tsx       # Edit form  
  ├── employeesShow.tsx       # Detail view
  └── EmployeesBulkImport.tsx # Bulk import from Excel/CSV
```

Example patterns from `employeesList.tsx`:
- Use `FieldGuesser` for auto-generated fields from API metadata
- Custom `ListActions` with `SelectColumnsButton`, `CreateButton`, bulk import button
- Custom `Empty` component with Bulgarian messages
- `FunctionField` for computed fields (row numbers, relations)
- All labels in Bulgarian: `label="Име"`, `label="Добави служител"`

Frontend connects to API via `NEXT_PUBLIC_ENTRYPOINT` env var (set to `http://php` in compose.yaml).

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

## Connect to the API
- Base URL: `http://localhost` (same-origin with PWA)
- API Docs: `http://localhost/docs` (Swagger UI)
- Admin: `http://localhost/admin` (API Platform Admin)

## Install dependencies
- Backend: `docker compose exec php composer install`
- Frontend: `docker compose exec pwa npm install`   

