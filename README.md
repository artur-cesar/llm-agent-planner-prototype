# LLM Order Planner Prototype

A NestJS study of LLM-driven tool execution, persisted conversations, and bounded execution loops. The model chooses one action per round; the application executes tools and returns one final response per user request.

The project builds on [tool-caller-prototype](https://github.com/artur-cesar/tool-caller-prototype), which supported at most one tool execution per request. This version can run several tools in successive rounds.

## Run with Docker Compose

Requirements: Docker with Compose and an Anthropic API key with access to the configured model. Local development uses Node 22.22.2 and npm 10.9.7.

```bash
# First setup only; preserve an existing .env.
cp .env.example .env
```

Set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in `.env`, then start the services:

```bash
docker compose up -d
```

The application container installs dependencies and starts Nest in watch mode. Wait for installation and startup in the logs, then apply pending migrations before sending requests:

```bash
docker compose logs -f llm-planner-application
# Exit the log viewer with Ctrl+C, then:
docker compose exec llm-planner-application npm run migration:run
```

Default addresses from `.env.example`:

| Service | Host address | Container port |
| --- | --- | --- |
| API | http://localhost:3001/ask | 3000 |
| Swagger | http://localhost:3001/docs | 3000 |
| PostgreSQL | localhost:5433, database `llm_agent_planner` | 5432 |
| Dozzle | http://localhost:8080 | 8080 |

Dozzle shows live logs for this Compose project. Select `llm-planner-application`. Its web port is bound to the local machine. See the [Dozzle setup guide](https://dozzle.dev/guide/getting-started).

After changing `.env`, recreate the application container to load the new values:

```bash
docker compose up -d --no-deps --force-recreate llm-planner-application
```

### Run Nest on the host

Start only PostgreSQL and, optionally, Dozzle with Compose. In Bash, load the local environment and use the database's external port:

```bash
npm ci
docker compose up -d llm-planner-database llm-planner-dozzle
set -a
. ./.env
set +a
export DATABASE_HOST=localhost
export DATABASE_PORT="$DATABASE_EXTERNAL_PORT"
npm run migration:run
npm run start:dev
```

Nest then listens on `PORT` (3000 by default), so Swagger is http://localhost:3000/docs. The host and container paths share `dist/`. Artifacts created by the container may belong to root and block a host build with `EACCES`; in that case, run build/migration commands inside the container or restore ownership of `dist/` before running them on the host. Avoid switching between host and container builds while the watch process is writing to that directory.

## Request flow and responsibilities

```text
POST /ask
  → AskService: resolve conversation and owner, acquire local guard, save prompt
  → MessagesService + message mapper: load ordered, typed history
  → TurnRunnerService
      → LlmGateway / AnthropicGateway: request the next decision
      → final answer: finish the loop
      → tool call: ToolExecutorService resolves and executes a registered tool
      → append call and structured result, then ask the LLM again
  → message mapper + MessagesService: atomically save generated messages
  → return content and conversationId; release the local guard
```

`TurnRunnerService` calls `LlmGateway` directly. Planning means that the model chooses the next action after each result; there is no separate planner class or precomputed execution plan. The Anthropic gateway and factory are the reference for another provider. Anthropic is the default and only registered provider; initialization requires its API key and model.

The gateway requests at most one tool call per response. Multiple calls returned unexpectedly, or responses truncated by `max_tokens`, fail explicitly before the runner executes that response. Several tools can still run in one user request, one per round, followed by one final response.

`src/conversations/message.mapper.ts` converts typed user text, assistant text, tool calls, and tool results to and from the existing storage format. Tool results stay structured in memory and are serialized at storage/provider boundaries. Invalid stored tool metadata produces an error containing the message ID instead of silently generating an empty tool identifier.

## API examples

Send `POST http://localhost:3001/ask` with `Content-Type: application/json` and an optional `x-user-id` header.

New conversation, two tools:

```json
{
  "prompt": "What are the items and status of order 123?"
}
```

Expected behavior: execute `getOrderStatus` and `getOrderItems` in successive rounds (the order is chosen by the model), then return a combined answer. The study repository contains Keyboard and Mouse for order 123, with status PAID.

The response contains `content` and a UUID `conversationId`. Reuse that UUID and the same user header to continue:

```json
{
  "prompt": "And what about order 456? Please check its status and items.",
  "conversationId": "7804bd33-6480-449d-9ef5-aec6a38750f4"
}
```

Replace the example UUID with the one returned to you. To exercise clarification, start with “What is the status of my order?” and then provide “Order 123” in a follow-up.

The system prompt allows answers from conversation history. Repeating a request in the same conversation may therefore produce a direct answer with zero new tool calls. Use a new conversation to test the complete tool loop. Tool selection and wording depend on the live model; programmed tests verify orchestration, not the model's interpretation of arbitrary prompts.

### Conversation ownership

`x-user-id` is a simulated identity, not authentication. The application trims it and retrieves conversations by both ID and user. Omitted or blank values use `anonymous-user`. All requests using this fallback share the same simulated identity.

A missing conversation or one owned by another user returns 404 before reading or writing messages. An overlapping turn on the same conversation returns 409 before saving its prompt.

## Persistence, execution limits, and failure behavior

The prompt is saved before calling the LLM. Generated messages are saved in a short transaction only after the turn completes. If the LLM or batch persistence fails, the prompt remains; generated messages are not partially stored. This does not undo tool execution or retry the HTTP request. No database transaction stays open during LLM calls.

Messages are loaded by a generated database sequence. Legacy rows are backfilled using the previous timestamp/UUID order; the original order of tied legacy timestamps cannot be recovered. Gaps after rollback are expected.

The conversation guard is local to one application process and is released on success or failure. Different conversations can run independently. Multiple application instances require shared coordination.

Current defaults:

| Limit | Value |
| --- | --- |
| Loop iterations per request | 5 |
| LLM calls per request | 5 |
| Tool calls per request | 3 |
| Attempts per tool call | 2 |
| Timeout per attempt | 2000 ms |
| Retry delay | 100 ms × failed attempt number |

Attempts inside the executor do not consume additional runner tool-call slots. Limits stop the turn with an explicit error. Tool failures are returned as structured results so the model can explain partial success; final wording is still the model's responsibility.

## Tool registration and execution

`src/tools/tool-registry.ts` pairs each public definition with its handler in one static list. `AskService` advertises definitions from that registry; the executor resolves names from the same registry. Add a tool's definition and handler there rather than updating separate name lists and switches.

The executor validates the current string-only schemas, including required and unexpected properties, then applies timeout, retry, and result normalization. `ToolExecutionFailure` classifies expected failures. Unexpected exceptions are normalized without exposing internal messages. Latency and failure simulations live in test doubles. `OrderRepository` supplies the study's in-memory order data.

All registered tools are read-only. `Promise.race` limits the wait; it does **not** cancel the operation. An attempt can finish after its timeout, even while a retry runs. Operations with side effects need their own cancellation/idempotency policy before reusing this retry behavior.

## Validation

```bash
npm run lint
npm run format:check
npx tsc --noEmit --incremental false -p tsconfig.json
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

Unit tests cover direct responses, clarification and persisted context, ownership, overlap, sequential tools, partial failures, runtime limits, mapper compatibility, and retry/timeout behavior. They use programmed gateway responses or a mocked Anthropic client, without paid API calls.

The PostgreSQL persistence suite requires `TEST_DATABASE_URL`. Without it, that suite is skipped; the HTTP documentation tests still run. Use a disposable database: the suite applies and reverts migrations and inserts test data. Never use the application's database.

```bash
TEST_DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/TEST_DATABASE npm run test:e2e -- --runInBand
```

The PostgreSQL suite checks atomic rollback, insertion order with tied timestamps, migration backfill/reapplication, and complete turns reloaded from storage. A passing run without this suite does not validate database persistence.

## Development workflow

Specifications in `spec/` describe tasks and acceptance criteria. Follow `spec/EXECUTION_PROTOCOL.md` and execute one active spec at a time. `spec/ROADMAP.md` provides product context; cross-cutting maintenance does not advance its milestones.
