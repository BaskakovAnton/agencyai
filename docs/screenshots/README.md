# Снимки экранов: что здесь лежит

| Каталог | Назначение | Состав |
|---|---|---|
| `redesign-stage-5-kit/` | **Актуальный цикл дизайна**: финальные экраны, сравнение с эталонами и «до/после» со стилем DarkStore | 28 + 28 + 28 |
| `ux4/` | Экран подразделений и подтверждения завершения (UX-4) | 8 (обзор, карточка, реестр, модель × 1440 и 390) |
| `audit/` | Артефакты аудита доступности и UX (`bun run audit`) | 40 + `audit.json` |
| `redesign-baseline-catalog/` | Снимки утверждённых макетов (`docs/redesign-reference`) | 60 |
| `redesign-baseline/` | Первый baseline цикла 17.11.2026 (история) | 32 |
| `redesign-stage-5/` | Финал первого цикла дизайна (история) | 35 |
| `acceptance/` | Замеры и панели токенной приёмки | 30 |

## Что удалено при уборке 24.11.2026

Промежуточные каталоги `redesign-stage-1..4`, `redesign-stage-1-kit..4-kit`, стиль DarkStore (`redesign-stage-6`, `-7`) и панели `acceptance/*darkstore*` — всего ≈63 МБ. Они полностью доступны в истории git до коммита `8cb6217`.

## Как переснять

```bash
bun run serve:demo                                  # статика демо на :4321
bun run scripts/redesign-shots.ts docs/screenshots/<папка> refs   # приложение + эталоны, 4 контрольных размера
bun run audit                                       # доступность и метрики → docs/screenshots/audit/
```
