# ToDo — Senior Full Stack Exercise
An app to do small things to make your day productive

Stack
- Angular 21
- ASP.NET Core / .NET 10
- xUnit
- Vitest
- In-memory persistence

Architecture
Angular:
UI -> TodoStore -> TodoApiService -> HTTP

Backend:
Controller -> ITodoRepository -> InMemoryTodoRepository


## Run
# Backend:
dotnet run

# Frontend:
ng serve

## Tests:
dotnet test

ng test

## Key design decisions

- In-memory storage as required by the exercise
- ConcurrentDictionary to safely handle concurrent requests
- Immutable Todo records
- TimeProvider for deterministic time-based testing
- Signals instead of NgRx because application state is small
- HTTP/domain concerns separated in the frontend
- API contracts separated from domain models

## Deliberate limitations

- Todos disappear when the API restarts
- No authentication or user ownership
- No external database
- No distributed persistence
- Intended as a small engineering exercise

## Production evolution

- EF Core + PostgreSQL/SQL Server
- Authentication/authorization
- Structured logging and telemetry
- Health checks
- CI/CD
- E2E tests