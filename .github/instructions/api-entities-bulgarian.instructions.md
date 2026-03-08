---
description: "Use when creating or editing Symfony API Platform Doctrine entities in api/src/Entity. Enforces Bulgarian labels/messages, ApiResource defaults, filters, naming, and lifecycle conventions."
name: "API Entity Conventions (BG)"
applyTo: "api/src/Entity/**/*.php"
---
# API Entity Conventions (BG)

Use these rules when changing entity classes under `api/src/Entity/`.

- Keep API-facing text in Bulgarian.
- Use snake_case for properties (`first_name`, `created_at`).
- Add validation messages in Bulgarian (`Assert\\NotBlank`, etc.).
- Add `ApiProperty` descriptions/examples in Bulgarian for user-facing fields.
- Configure `ApiResource` with:
  - `mercure: true`
  - read/write serialization groups (`<entity>:read`, `<entity>:write`)
  - `paginationItemsPerPage: 30`
- Add lifecycle callbacks for timestamps where relevant (`#[ORM\\HasLifecycleCallbacks]`).
- Prefer standard filters:
  - `SearchFilter`: `partial` for text, `exact` for enums/IDs/relations
  - `OrderFilter`: include commonly sorted fields and `order` parameter
- Keep enum values Bulgarian when they represent user-facing status/state values.

## Quick Checklist

- Is every user-facing message/label Bulgarian?
- Are property names snake_case?
- Are serialization groups and pagination configured?
- Are filters declared for expected search/sort behavior?
- If schema changed: generate, review, and run Doctrine migration in Docker container.
