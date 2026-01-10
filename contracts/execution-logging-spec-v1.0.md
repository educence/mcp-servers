# Execution Logging Spec
**Version:** 1.0
**Last Updated:** 2026-01-10

---

## Purpose

Claude logs significant executions to enable:
- Pattern extraction (what keeps breaking?)
- Contract improvement proposals
- Perplexity audits

---

## Log Location

```
~/jen-os/logs/claude-executions/
├── YYYY-MM-DD-task-id.md      # Normal execution logs
└── exceptions/
    └── YYYY-MM-DD-exception-id.md  # When things go wrong
```

---

## Log Format (Normal)

```markdown
# Execution Log: [TASK-ID]

**Timestamp:** 2026-01-10T14:30:00Z
**ENV:** dev | stage | prod
**RISK:** low | medium | high
**STATE Transition:** PLAN → DRAFT

## Task
[Brief description]

## Tools Used
- Tool 1: [result summary]
- Tool 2: [result summary]

## Outcome
[Success | Partial | Failed]

## Issues
[None | List of issues encountered]

## Contract Gaps
[None | Areas where contract was unclear/insufficient]
```

---

## Exception Log Format

```markdown
# Exception: [EXCEPTION-ID]

**Timestamp:** 2026-01-10T14:30:00Z
**Severity:** warning | error | critical
**ENV:** dev | stage | prod

## What Happened
[Description of the failure]

## Root Cause
[Best guess at why]

## Contract Reference
[Which contract section was relevant]

## Proposed Fix
[Suggestion for contract or behavior change]

## Workaround Used
[How we recovered, if applicable]
```

---

## When to Log

| Event | Log Type |
|-------|----------|
| Successful multi-step execution | Normal |
| Tool call failure | Exception |
| Missing Criticals triggered | Exception |
| Self-Test Gate failure | Exception |
| Contract ambiguity encountered | Exception |
| Prod deployment | Normal (always) |

---

## Pattern Extraction

Periodically (or on request), Claude should:

1. Read last N execution logs
2. Group issues into patterns
3. Propose contract changes addressing top patterns
4. Output as `[HANDOFF TO JEN]` with:
   - Pattern summary
   - Proposed contract diff
   - Expected behavior change

---

## Integration with Notion

Significant executions should also be logged to **AI Traces** database:
- ID: `9272e7a691ab4c50b5b9b28cc2f41f3d`

Filesystem logs are for Claude's self-improvement.
Notion logs are for Jen's visibility.

---

## Version History

| Version | Date | Changes |
|---------|------|--------|
| 1.0 | 2026-01-10 | Initial spec |