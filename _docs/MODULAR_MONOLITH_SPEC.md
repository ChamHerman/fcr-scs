# Architectural Specification: Transition from Distributed Microservices to Modular Monolith Backend

## Problem Statement

Currently, the application architecture splits business logic into multiple separate microservice folders inside `business_logic_layer`, with each microservice running on its own local HTTP port (e.g., payment service on port 3002, smart contract service on port 3001). However, all these services share a single database schema via Prisma in `data_layer`, operate within the same repository, and are deployed together.

This creates significant operational and development pain points:
1. **Frontend Friction**: The frontend (`presentation_layer`) must configure and manage separate API base URLs, handle CORS across multiple ports, and manage multi-origin authentication headers.
2. **Developer Experience (DX) Friction**: Developers must spin up 8+ service processes, 1 frontend, and 1 database instance locally, resulting in high memory consumption, port collision issues, and complex terminal orchestration.
3. **Architectural Anti-Pattern**: The setup functions as a "Distributed Monolith" — incurring all network overhead, inter-service HTTP latency, and operational complexity of microservices without achieving true database isolation or independent deployment benefits.

## Solution

Consolidate the separate microservice HTTP listeners into a unified **Modular Monolith** API server.

Key aspects of the solution:
1. **Unified API Gateway / Server**: A single HTTP server process listening on port 3030 that mounts all business logic modules under structured routes (`/api/payments`, `/api/smart-contract`, etc.).
2. **Preserved Module Boundaries**: Maintain existing folder-level domain isolation inside `business_logic_layer/` (controllers and services remain organized by business domain).
3. **Single Entry Point**: All frontend requests target `http://localhost:3030/api`, unifying CORS, authentication middleware, and error handling.
4. **Simplified Developer Experience**: Local development requires running only 3 processes (1 Database, 1 Unified Backend API Server, 1 Frontend).

## User Stories

1. As a full-stack developer, I want to run a single backend command to start all API routes, so that local development setup is fast and efficient.
2. As a frontend developer, I want to call all business logic APIs via a single unified base URL (`http://localhost:3030/api`), so that I do not need to manage multiple port configurations or cross-port CORS settings.
3. As a backend developer, I want business logic modules to remain cleanly separated in their own domain folders, so that module boundaries are clear and maintainable.
4. As a backend developer, I want inter-module communication to occur via in-memory TypeScript function calls rather than HTTP network requests, so that latency is minimized and data consistency can be guaranteed via database transactions.
5. As a DevOps engineer, I want to deploy a single unified backend application process, so that container management, health monitoring, and logging are simplified.
6. As a security engineer, I want authentication and CORS middleware to be applied once at the central API entrypoint, so that security rules are consistently enforced across all endpoints.
7. As a QA engineer, I want to execute integration tests against a single unified Express application, so that test suites run faster and do not depend on external port bindings.

## Implementation Decisions

- **Architectural Shift**: Transition from a distributed microservice deployment model to a **Modular Monolith** architecture.
- **Single Process Execution**: Consolidate individual service listeners into one HTTP server instance listening on a designated port (`3030`).
- **Router Export Pattern**: Refactor each domain module inside `business_logic_layer` (e.g., `payment_service`, `smart_contract_service`) to export Express `Router` instances instead of initializing standalone Express `app.listen()` servers.
- **Central API Entrypoint**: Introduce a root-level backend server entrypoint responsible for importing module routers, configuring global middlewares (CORS, body parsing, auth, logging), and mounting routers to standard REST endpoints (`/api/<module_name>/*`).
- **Prisma Data Layer Access**: All modules continue to share access to the centralized `data_layer` Prisma client, enabling unified database connections and cross-module ACID transactions where needed.
- **Monorepo Script Consolidation**: Update root `package.json` scripts to launch the unified backend server and presentation layer concurrently, reducing process management overhead.

## Testing Decisions

- **Testing Seam**: The primary testing seam will be at the **HTTP API Endpoint level** (`/api/*`) using Supertest against the unified Express application instance. This is the highest and most effective seam available, testing the entire backend pipeline (routing -> controller -> service -> database) without requiring live port binding.
- **External Behavior Focus**: Tests will send HTTP requests to `/api/<module>/<route>` and verify HTTP status codes and JSON responses, treating the internal controller and service logic as black-box implementations.
- **Modules to be Tested**: All existing route integration tests across `payment_service`, `smart_contract_service`, and other business logic modules will be executed against the central mounted router setup.
- **Prior Art**: The existing Supertest suites in `business_logic_layer/payment_service/src/__tests__` serve as the primary prior art and blueprint for backend integration testing.

## Out of Scope

- Refactoring internal domain business logic or database entity definitions within individual services.
- Splitting the Prisma database schema into separate per-service databases.
- Extracting any service into a separate standalone language runtime or standalone container (can be done in a future phase if scaling demands require it).

## Further Notes

- **Future Scalability**: If a specific module (e.g., AI prediction or heavy blockchain indexers) requires dedicated GPU hardware or independent scaling in production in the future, the clean modular router boundaries make it straightforward to extract that specific router into its own microservice without affecting other modules.
