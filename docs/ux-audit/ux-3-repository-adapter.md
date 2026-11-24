# UX-3 · Repository-порты и адаптер в памяти

**Статус:** реализовано и проверено локально · **push не делался** · UI не изменялся.
**Основа:** UX-2 (`docs/ux-audit/ux-2-domain-model-implementation.md`), §10 которого вынес Repository-интерфейсы в отдельную задачу.

## 1. Что сделано

| Файл | Строк | Назначение |
|---|---|---|
| `src/core/org/workspace.ts` | 62 | неизменяемый снимок `OrgWorkspace` и чистые переходы: `assignmentInput`, `completionInput`, `applyAssignmentResult`, `applyCompletionResult`, `withLifecycle` |
| `src/core/org/repository.ts` | 55 | порты, определённые доменом: `OrgQuery` (чтение), `OrgStorePort` (`load`/`save` снимка), `OrgCommandPort` (`runAssignment`/`runCompletion`), сводный `OrgRepository`; индексы `incidentIdsOf`, `assignmentsOfDepartment` |
| `src/data/org-repository.ts` | 78 | адаптер в памяти: `createOrgRepository(workspace)` и `createDemoOrgRepository(graph, seed)` |
| `tests/org-repository.test.ts` | — | проверки порта: чтение, согласованность срезов, неизвестные id, откат неуспешной операции, полный цикл завершения, неизменяемость снимка, `save`/`load` |

Правило сохранено: **ни один существующий файл не изменён**, всё аддитивно.

## 2. Контракт портов

```ts
interface OrgQuery {
  organizationId: string;
  directory: OrgDirectory;
  incidentIds: readonly string[];
  assignmentsOf(incidentId): readonly IncidentAssignment[];
  activeAssignmentsOf(incidentId): readonly IncidentAssignment[];
  accountableOf(incidentId): IncidentAssignment | undefined;
  participantsOf(incidentId): readonly IncidentAssignment[];
  eventsOf(incidentId): readonly DomainEvent[];
  lifecycleOf(incidentId): IncidentLifecycle | undefined;
  incidentIdsOfDepartment(departmentId): readonly string[];
}

interface OrgStorePort { load(): OrgWorkspace; save(workspace: OrgWorkspace): void; }

interface OrgCommandPort {
  runAssignment(incident, operation): AssignmentResult;
  runCompletion(incidentId, operation): CompletionResult;
}
```

Домен не знает про хранилище: операции остаются чистыми функциями, адаптер только подставляет снимок и сохраняет результат. `async` намеренно нет — пока нет backend; при появлении адаптера с записью порты получат асинхронные варианты, домен менять не придётся.

## 3. Проверки

| Проверка | Результат |
|---|---|
| `bun run typecheck` | чисто |
| `bun test` | **239 pass / 0 fail** (было 231; +8 проверок порта) |
| `bun run e2e` | 54 passed (не затронуто) |
| Лимит 200 строк | соблюдён |

## 4. Найденная семантика (важно)

1. **Подтверждение завершения закрывает все активные назначения** обращения — после `completed` активного ответственного нет. Проверено тестом.
2. **Переоткрытое обращение (`reopened`) остаётся без активного назначения** — по правилам UX-2 прежнее завершение сохраняется, но для продолжения работы нужно новое назначение. Осознанное следствие инвариантов; решение о возврате ответственного при переоткрытии — задача UX-4.
3. **Неуспешная операция не меняет снимок** — `applyAssignmentResult` возвращает тот же объект (проверено сравнением ссылок).

## 5. Что предлагается в UX-4 (нужно ваше решение)

UI по-прежнему не изменялся: подключение подразделений к утверждённым экранам меняет принятый макет, поэтому нужна отдельная команда.

**Интеграция с Dashboard (по утверждённому `overview.html`, без новых блоков):**
- в панели «Распределение обращений» добавить второй разрез «по подразделениям» (в эталоне это легенда: бейдж + количество);
- в таблице «Требуют внимания» заменить колонку «Этап» на «Подразделение» — данные есть в порту (`accountableOf`);
- в KPI-ноте «Требуют внимания» показать «в том числе N с риском SLA» и «N ждут подтверждения» — обе цифры уже считаются доменом (`lifecycleOf`);
- карточка обращения: в блоке «Участники» показать подразделения и сотрудников с типом участия вместо обезличенной роли;
- сценарий подтверждения (подтвердить/отклонить) с проверкой права `incident.complete` — в демо роль контролёра переключается.

**Технические шаги UX-4:** `Incident` не расширяем — репозиторий подключается к SPA как дополнительный источник; адаптер с сохранением (localStorage) — по желанию.
