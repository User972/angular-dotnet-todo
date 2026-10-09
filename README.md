# ToDo — Senior Full Stack Exercise
An app to do small things to make your day productive

Stack
- Angular
- ASP.NET Core / .NET 10
- xUnit
- Vitest
- In-memory persistence

Architecture
Angular:
UI → TodoStore → TodoApiService → HTTP

Backend:
Controller → ITodoRepository → InMemoryTodoRepository

Design decisions
- In-memory persistence intentionally used per exercise requirement
- ConcurrentDictionary because ASP.NET handles concurrent requests
- Immutable TodoItem records
- TimeProvider for deterministic timestamp tests
- HTTP 404/409 represented as domain outcomes on the Angular side
- Signals chosen instead of NgRx because app state is small
