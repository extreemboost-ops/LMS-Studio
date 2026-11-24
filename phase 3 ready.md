PHASE 03.1 — Production Backend Foundation

Project: SCORM & H5P Authoring Studio

Status: Phase 02.2 Approved

Objective

Begin Phase 03 by implementing the actual backend foundation of the SCORM & H5P Authoring Studio.

This milestone establishes the backend infrastructure only.

Do not attempt to implement all SaaS modules in one phase.

The existing frontend design and architecture must remain intact.

1. Mandatory Project Inspection

Before writing code, inspect:

Existing project directory structure.

package.json

prisma/schema.prisma

All docs/database/ documentation.

All docs/database-validation/ documentation.

src/types/

src/services/

Existing frontend contexts and API abstractions.

Understand the existing architecture before introducing backend code.

Do not overwrite or unnecessarily restructure existing frontend modules.

2. Backend Technology

Use the approved stack:

Node.js

Express.js

TypeScript

PostgreSQL 16+

Prisma ORM 7

Zod for request validation

Structured logging

Centralized error handling

Use the Prisma 7 configuration and database adapter approach documented in the existing architecture.

Do not downgrade Prisma or introduce incompatible configuration patterns.

3. Backend Directory Architecture

Create a clean modular backend structure.

Suggested organization:

server/

src/

config/

database/

middlewares/

modules/

routes/

utils/

types/

app.ts

server.ts

tests/

Organize modules so authentication, organizations, content, media, H5P, SCORM and LMS integrations can be developed independently in later milestones.

4. Database Integration

Implement:

PostgreSQL connection configuration.

Prisma Client initialization.

Database connection health checks.

Graceful database disconnection.

Environment-based configuration.

Development and production configuration separation.

Use the existing approved prisma/schema.prisma.

Do not redesign the schema.

Do not run destructive database operations.

Do not run production migrations.

Prepare the migration workflow and document the commands.

5. API Infrastructure

Implement:

Versioned API prefix: /api/v1

Centralized route registration.

Request validation.

Standardized API response structure.

Centralized exception handling.

Request IDs.

Structured request logging.

CORS configuration.

Secure HTTP headers.

Rate-limiting foundation.

Health and readiness endpoints.

Suggested endpoints:

GET /api/v1/health

GET /api/v1/health/database

GET /api/v1/health/readiness

Health endpoints must report actual service status, not hardcoded success.

6. Security Foundation

Prepare:

Environment secret management.

Secure configuration validation.

Authentication middleware architecture.

Tenant context architecture.

Authorization middleware interfaces.

Input validation.

Safe error responses.

Important:

Do not trust organizationId supplied directly by frontend requests.

Tenant context must eventually originate from verified authentication.

Prepare RLS-compatible transaction handling according to Phase 02.2.

Do not claim tenant isolation is operational until actual PostgreSQL RLS policies and integration tests have been implemented.

7. Frontend Integration Preparation

Inspect the existing frontend services and API abstraction.

Prepare the backend API contract so existing mock services can later be replaced without redesigning the UI.

Preserve:

Existing component structure.

Existing styling.

Existing navigation.

Existing responsive behavior.

Existing design system.

Do not remove mock services yet unless a specific integration test requires it.

8. Testing

Implement and execute tests for:

Server startup.

Configuration validation.

Database connection.

Health endpoints.

Error handling.

Request validation.

Unknown route handling.

Graceful shutdown.

Use a real test database where required.

Clearly distinguish tests executed from tests pending external environment setup.

9. Documentation

Create:

docs/backend/

Include:

01-backend-architecture.md

02-project-structure.md

03-database-integration.md

04-api-conventions.md

05-security-foundation.md

06-environment-configuration.md

07-testing-report.md

08-phase-03.1-completion-report.md

10. Completion Criteria

Phase 03.1 is complete only when:

Backend starts successfully.

Database connection works.

Prisma Client works with the approved schema.

Health endpoints return real results.

Error handling works.

Tests have been executed.

Existing frontend still builds successfully.

Documentation is complete.

Strict Restrictions

Do not implement all business modules.

Do not implement fake authentication.

Do not create fake database records to simulate backend functionality.

Do not claim unimplemented services are operational.

Do not replace the existing UI.

Do not introduce unnecessary technologies.

Do not proceed to Phase 03.2 automatically.

At completion, provide:

Files created and modified.

Actual commands executed.

Test results.

Database connection status.

Known limitations.

Remaining tasks.

Wait for explicit approval before Phase 03.2.