# Repository Discovery Heuristics & Static Analysis Guide

This guide provides deterministic heuristics and regex/grep search patterns to analyze any software repository, identifying its backend, frontend, API endpoints, DTO contracts, authentication mechanisms, and business workflows.

---

## 1. Technology Stack Identification

Check root files and package manifests to determine the project composition:

| Stack / Framework | Indicator Files | Commands / Patterns |
| :--- | :--- | :--- |
| **Node.js / TypeScript** | `package.json`, `tsconfig.json` | Inspect `dependencies` (e.g. `express`, `@nestjs/core`, `fastify`, `koa`, `axios`, `@tanstack/react-query`) |
| **.NET (C# / F#)** | `*.sln`, `*.csproj`, `Program.cs` | Inspect `<PackageReference>` for `Microsoft.AspNetCore.*`, `Swashbuckle.AspNetCore` |
| **Java / Kotlin** | `pom.xml`, `build.gradle`, `build.gradle.kts` | Look for `spring-boot-starter-web`, `quarkus-resteasy`, `micronaut` |
| **Python** | `pyproject.toml`, `requirements.txt`, `Pipfile` | Look for `fastapi`, `django`, `djangorestframework`, `flask` |
| **Go** | `go.mod`, `go.sum` | Look for `github.com/gin-gonic/gin`, `github.com/gofiber/fiber`, `github.com/labstack/echo` |
| **PHP** | `composer.json`, `artisan` | Look for `laravel/framework`, `symfony/framework-bundle` |
| **Frontend: Angular** | `angular.json` | Look for `@angular/core`, `@angular/common/http` |
| **Frontend: React** | `package.json` | Look for `react`, `react-dom`, `@reduxjs/toolkit`, `axios` |
| **Frontend: Vue** | `vue.config.js`, `vite.config.*` | Look for `vue`, `pinia`, `vuex`, `axios` |

---

## 2. API Contract & OpenAPI Specification Discovery

Always search for explicit API specifications before reverse-engineering code:

### File Targets
Search recursively for:
- `*swagger*.json`, `*swagger*.yaml`, `*swagger*.yml`
- `*openapi*.json`, `*openapi*.yaml`, `*openapi*.yml`
- `.postman_collection.json`
- `api-spec/`, `docs/api/`, `schemas/`

### Extraction Strategy
When an OpenAPI/Swagger spec is located:
1. Extract `servers.url` to determine default base paths.
2. Iterate `paths`:
   - Path string & HTTP method (`get`, `post`, `put`, `delete`, `patch`).
   - `operationId` & `tags` (use for service and scenario names).
   - `requestBody.content.application/json.schema` (generate factory fields).
   - `responses[200|201].content.application/json.schema` (generate check assertions).
   - `security` definitions (determine Bearer, OAuth2, or API Key headers).

---

## 3. Backend Endpoint Discovery Patterns

When no OpenAPI specification is present, search source code for framework-specific route definitions:

### A. ASP.NET Core (.NET)
- **Controller Attributes**:
  ```csharp
  [ApiController]
  [Route("api/[controller]")] // or [Route("api/v1/[controller]")]
  [HttpGet("{id}")]
  [HttpPost]
  [HttpPut("{id}")]
  [HttpDelete("{id}")]
  ```
- **Minimal APIs** (`Program.cs`):
  ```csharp
  app.MapGet("/api/...", ...);
  app.MapPost("/api/...", ...);
  app.MapPut("/api/...", ...);
  app.MapDelete("/api/...", ...);
  ```
- **DTOs / ViewModels**:
  Look in `Models/`, `DTOs/`, `Requests/`, `Responses/`, or record types with `[JsonPropertyName]` or data annotations (`[Required]`, `[StringLength]`).

### B. Node.js (Express / Fastify / NestJS)
- **NestJS**:
  ```typescript
  @Controller('users')
  @Get(':id')
  @Post()
  @Put(':id')
  @Delete(':id')
  ```
- **Express / Fastify**:
  ```javascript
  router.get('/users', ...);
  router.post('/users', ...);
  app.get('/api/v1/...', ...);
  ```
- **DTOs**:
  Look for TypeScript interfaces (`interface UserDto`), Zod schemas (`z.object({...})`), or Joi schemas.

### C. Java (Spring Boot)
- **Controller Annotations**:
  ```java
  @RestController
  @RequestMapping("/api/v1/users")
  @GetMapping("/{id}")
  @PostMapping
  @PutMapping("/{id}")
  @DeleteMapping("/{id}")
  ```
- **DTOs**:
  Look in `dto/`, `model/`, `entity/` for classes with Jackson annotations (`@JsonProperty`, `@NotNull`).

### D. Python (FastAPI / Django REST Framework)
- **FastAPI**:
  ```python
  @router.get("/users/{id}")
  @router.post("/users", response_model=UserResponse)
  ```
- **Django REST Framework**:
  Look in `urls.py` (`DefaultRouter`, `path('api/...', ...)`), `views.py` (`ModelViewSet`, `APIView`), and `serializers.py`.

### E. Go
- **Gin / Fiber / Echo**:
  ```go
  r.GET("/api/v1/users/:id", ...)
  r.POST("/api/v1/users", ...)
  ```

---

## 4. Frontend API Service Discovery

Frontend services reveal how client applications interact with the backend, including headers, query parameters, and URL prefixes:

### A. Angular Services
- Search pattern: Look for `@Injectable()` and `HttpClient`.
  ```typescript
  // Example pattern to detect:
  constructor(private http: HttpClient) {}
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }
  ```
- Search for `environment.ts` or `environment.prod.ts` to discover `apiBaseUrl` or `backendUrl`.

### B. Axios Instances / Custom Fetch
- Search pattern: `axios.create({ baseURL: ... })`.
- Look for interceptors:
  ```typescript
  axiosInstance.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  ```
  This confirms token storage keys (e.g. `localStorage.getItem('token')`) and header formats.

### C. React Query / RTK Query
- Search for `createApi({ baseQuery: fetchBaseQuery({ baseUrl: ... }) })`.
- Endpoints defined in `endpoints: (builder) => ({ ... })`.

---

## 5. Authentication & Authorization Discovery

Determine:
1. **Login Endpoint**: Search for `/login`, `/auth`, `/token`, `/signin`, `/authenticate`.
2. **Request Credentials**: Search for fields like `username`, `email`, `password`, `grant_type`, `client_secret`.
3. **Token Response Shape**: Search for `accessToken`, `token`, `jwt`, `id_token`, `access_token`.
4. **Header Format**: Typically `Authorization: Bearer <token>` or custom headers (`X-Auth-Token`, `ApiKey`).
5. **Roles & Scopes**: Check for `@Authorize(Roles = "Admin")`, `@PreAuthorize("hasRole('ADMIN')")`, or route middleware (`roleGuard`).

---

## 6. Business Workflow Discovery

A performance test must evaluate critical business paths, not just isolated endpoints. Search for:
1. **User Onboarding Workflow**:
   - Register user &rarr; verify email / login &rarr; update profile &rarr; setup permissions.
2. **Order / Checkout Journey**:
   - Search catalog &rarr; view product details &rarr; add to cart &rarr; submit order &rarr; verify invoice.
3. **CRUD Lifecycle Workflows**:
   - Create entity &rarr; retrieve entity by ID &rarr; update entity attributes &rarr; verify updated state &rarr; delete entity &rarr; verify 404.
4. **State Transitions**:
   - Draft &rarr; Submit &rarr; Approve &rarr; Complete (look for status update endpoints).
