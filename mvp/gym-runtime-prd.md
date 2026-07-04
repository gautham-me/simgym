# PRD: The Gym Runtime Engine

*v1.0 — product requirements, not an engineering HLD. Covers the core simulation/testing engine described at a high level in `PLAN.md §4.2`.*

## 1. What this document is

`PLAN.md` and `product-execution-plan.html` describe the whole SimGym product across three phases. This doc zooms into a single piece: **the Gym runtime engine** — the thing that takes an agent's prompt, tools, and traces and tells you whether it's safe to ship a change.

This is a product requirements doc: what the engine must do and why, from the point of view of the people who use it. It deliberately avoids implementation detail (container runtime, orchestration library, etc.) — those belong in an engineering HLD, written later, constrained by these requirements.

> **MVP note (added in review):** §14 defines how to build a first working version of this engine as a standalone CLI without pushing code into any existing production repo. Inline *MVP:* callouts throughout mark which requirements are in the first prototype cut and which are deferred. No original requirement has been removed — only annotated.

## 2. Problem statement

An engineer changes a system prompt or a tool schema. Today, the only way to know if that change broke something is to ship it and watch production. By the time you notice — a user complaint, a cost spike, a support ticket — the damage is done: a wrong answer, an infinite tool loop, a destructive action.

The Gym exists to answer one question before that change ships: **"Does this prompt still behave correctly against everything we know can go wrong?"**

## 3. Goals

- Give an engineer a verdict on a prompt/tool change in minutes, not in production.
- Make that verdict trustworthy enough that a fail blocks a merge and a pass is relied upon.
- Require nothing from the customer beyond three static files — no live DB access, no proprietary code, no long onboarding.

## 4. Non-goals

- CI/CD wiring, GitHub PR bots, prompt registries — Phase 2, `PLAN.md §5`.
- Production trace ingestion / the Shadow Loop — Phase 3, `PLAN.md §6`.
- Specific infra choices (container runtime, orchestration) — an HLD, not this doc.
- Pricing/packaging — see `pricing-framework.html`.

## 5. Glossary

| Term | Definition |
|---|---|
| **Gym** | One customer's configured instance of the runtime — their prompt, tools, and trace set, ready to test against. |
| **Scenario** | A failure-mode category the Gym tests for — e.g. *Adversarial*, *Corrupt/Unexpected Tool Results*, *Formatting/Response Styling* (full list in §8.2). |
| **Run** | One granular execution within a Scenario — a specific historical trace, replayed with a specific injected variant of that Scenario. Produces a trajectory. |
| **Trajectory** | The full step-by-step record of a Run: every message, tool call, tool response, and final output. |
| **Baseline** | The trajectory produced by a fresh run of the *current production prompt* on the same Run — what the candidate is compared against. |
| **Candidate** | The new/modified prompt being evaluated. |
| **Verdict** | Pass / Fail / Warn, judged on a single Run's own merits (§8.4a). |
| **Diff Classification** | Regression / Improvement / Neutral / Diverged — a separate, comparative judgment of a candidate Run against its baseline (§8.4b). |
| **Tool Response Layer** | The component that answers the agent's tool calls during a Run — by replay, synthetic generation, or deliberate failure injection (§8.1). |

## 6. Primary users

- **AI Software Engineer** — triggers Runs, reads verdicts, decides whether to ship. Primary consumer of the engine's output.
- **Engineering Leader / CTO** — doesn't touch the engine directly, but needs to trust its verdicts enough to let it gate production.
- **CI system** (Phase 2+) — same consumer as the engineer, automated. The engine's inputs/outputs shouldn't need to change shape when this user shows up.

## 7. User stories

1. As an AI engineer, I want to hand the Gym my system prompt, tool schemas, and historical traces, and get a verdict per Run — so I know before I ship whether I broke anything that used to work.
2. As an AI engineer, I want to see *why* a Run failed (which step, which tool call, what the agent did wrong) — not just pass/fail.
3. As an AI engineer, I want my candidate's behavior compared against the current production prompt on the same Run — so I know if I made things better, worse, or just different.
4. As an engineering leader, I want a guarantee that nothing the agent does during a Run can touch a real system.
5. As an AI engineer making a small, local change, I want to run only the Scenarios likely to matter — not the whole Gym — so I get a fast sanity check without waiting on a full sweep.
6. As an AI engineer, when a Run doesn't fail cleanly (the agent loops, hangs, or spirals), I want that caught and reported as its own failure mode, not a silent pass.

## 8. Functional requirements

### 8.1 Intake & the Tool Response Layer

**Intake**
- FR1. The engine accepts exactly three inputs per Gym: `system_prompt.txt`, `tools.json` (MCP-compatible tool schemas), `traces.json` (historical traces, 100 to start).
- FR2. The engine validates these before running anything, with specific, actionable errors (e.g. "tool `create_ticket` referenced in trace 14 has no schema in tools.json").
- FR3. No input requires live access to the customer's databases, internal APIs, or source code.

**Tool Response Layer** — the mechanism that answers every tool call an agent makes during a Run.
- FR4. From `tools.json`, the engine derives a synthetic response generator per tool — schema-valid, plausible data shaped to that tool's declared output — used whenever a call isn't covered by a replayed trace.
- FR5. The engine can also serve **replayed** responses: the literal tool output recorded in the historical trace, used when the candidate agent's call matches (or is equivalent to) the call the trace originally recorded. This keeps the test deterministic and grounded in real production data — no need to guess an answer that's already known.
- FR6. The Tool Response Layer supports deliberate **failure injection**, not just clean replay/synthesis — this is the primary mechanism by which Scenarios (§8.2) are actually executed as Runs.

### 8.2 Scenario Construction

Each Scenario is a failure-mode category. Running a Scenario fans out into many Runs — one per applicable historical trace, with that Scenario's variant injected at the relevant tool call site(s).

| Scenario | Injected variants | What it tests |
|---|---|---|
| **Expected** | Schema-valid, plausible "boring but correct" data | Baseline coverage for any legitimate path not seen in history |
| **Corrupt / Unexpected Tool Results** | Malformed data (schema violation); error responses (not-found, permission-denied, validation error); empty/partial/truncated results; stale or cross-tool-contradictory data; rate-limit/throttle response; boundary values (huge strings, unicode, nulls, extreme numbers) | Does the agent notice bad data, handle failure gracefully, and avoid assuming completeness it doesn't have? |
| **Adversarial** | Prompt injection embedded inside tool output content; spoofed authority (tool result impersonates a trusted system/role); exfiltration bait (tempts the agent into leaking prior context via a later call) | Does the agent treat tool data as data, not instructions — and resist manipulation? |
| **Semantic-but-valid Ambiguity** | Multiple equally valid matches for one query; two tools returning individually-valid, mutually contradictory facts | Does the agent disambiguate/ask rather than guess, and reconcile contradictions rather than picking arbitrarily? |
| **Formatting / Response Styling** | Tool results vary (in shape, verbosity, field presence) while the agent's *output* contract stays fixed | Does the candidate's final response still hold its required structure, tone, and length regardless of upstream tool-result variation? Distinct from the others — this checks the agent's output side, not its tool-handling. |
| **Scale** | Deep/complex nested structures (not raw volume) | Does the agent handle structurally complex data without losing track of it? |

Explicitly out of scope for the MVP taxonomy: latency/timeout injection, and raw result-set volume/pagination stress — cut for MVP scope, revisit later if needed.

Auto-generation is the default: for every clean historical trace, the engine automatically produces the mutated variants above at each relevant tool call site — no per-scenario customer configuration required to get coverage.

### 8.3 Execution & Isolation

- FR7. Every Run executes in an isolated environment such that nothing the agent does (including destructive actions like deleting files or "dropping a table") can affect anything outside that Run.
  - *MVP: isolation is achieved by construction. The agent never receives a real tool implementation — every tool call is answered by the Tool Response Layer (replay / synthesis / injection). A "destructive" action is just a mocked response, so no container or sandbox runtime is required for the prototype. Containers become relevant only if real tool execution is ever introduced later.*
- FR8. The engine can snapshot and roll back state between steps, so a Run can be forked and re-run from any point without re-executing everything before it.
  - *Why this matters:* generating the §8.2 taxonomy means many variants per tool call site. Without snapshotting, testing 10 variants at turn 5 of an 8-turn conversation means re-running turns 1–4 ten times — redundant execution of parts of the conversation that never change. With a snapshot taken right before the call in question, the engine runs the shared prefix once, then forks N cheap branches from that single point, one per injected variant.
  - *MVP: deferred. Snapshot/rollback is a performance optimization for fan-out, not a correctness requirement. The prototype simply re-runs the trace prefix per injected variant (redundant compute, far simpler to build). Revisit once run counts make prefix re-execution painful.*
- FR9. A Run that doesn't terminate on its own (the agent loops, or exceeds a reasonable step/time budget) is stopped and reported as its own failure mode — **non-terminating Run** — which is one of the explicit Fail triggers in §8.4a, not a separate side case.

### 8.4 Verdicts & Regression Detection

Two separate judgments are produced per Run — an absolute verdict, and (when a baseline exists) a comparative diff. These are deliberately kept independent: "is this Run itself okay" is not the same question as "did it get better or worse than before."

**8.4a — Absolute Verdict** (judged on the Run alone, no baseline required)
- FR10. Every Run produces one of **Pass**, **Fail**, or **Warn**, plus a human-readable reason.
- FR11. A Run is a **Fail** if the agent: calls a tool not present in `tools.json` (hallucinated tool); calls a real tool with arguments violating its schema; performs an action flagged as destructive/irreversible against mocked data; violates a configured cross-field invariant (below); or fails to terminate within budget (non-terminating Run, FR9).
- FR11a. **Invariant checks:** the customer can define simple, deterministic cross-field rules per tool — e.g. "`amount` in `issue_refund` must not exceed `total` from the most recent `get_order` call in this Run." This catches semantically-wrong-but-schema-valid actions (a schema-valid refund call for 10x the actual order total is exactly the kind of bug that looks clean but isn't) without requiring open-ended judgment. MVP scope is deterministic invariants only; open-ended "does this action make sense" judgment (LLM-as-judge) is Phase 2+, tied to the Triage Engine in `PLAN.md §6.2`.
- FR12. A Run is a **Warn** if it reaches a correct/acceptable final outcome via a trajectory containing something suboptimal that doesn't itself trigger a Fail — e.g. an unnecessary-but-harmless extra tool call, an avoidable clarifying question, minor style drift.
- *MVP: the Fail triggers in FR11/FR11a are fully deterministic and need no LLM — they are the trustworthy core of the prototype. The Pass/Warn distinction (FR12) uses a cheap LLM-as-judge in the MVP; keep it architecturally separated from the deterministic checks so a judge outage or flake can never suppress a hard Fail.*

**8.4b — Comparative Diff** (candidate vs. baseline, a separate operation from the absolute verdict)
- *MVP: Regression / Improvement / Neutral follow deterministically from comparing the two absolute verdicts. Only "Diverged" (same verdict, different path) needs the cheap LLM-as-judge from FR12.*
- FR13. For every Run with a baseline, the engine produces a structural diff (tool calls, order, arguments, final verdict) between the candidate's trajectory and the baseline's.
- FR14. The diff is classified independently of either trajectory's own verdict: **Regression** (candidate's verdict is worse than baseline's), **Improvement** (candidate's verdict is better), **Neutral** (same verdict, trajectory may still differ), or **Diverged** (different path taken, same verdict — flagged for visibility, not treated as bad).
- FR15. The baseline is always a **fresh run of the current production prompt** on the same Run, generated at test time — not a customer-supplied static baseline. This keeps the comparison point from ever going stale relative to what's actually in production.

### 8.5 Selective Scenario Execution

- FR16. An engineer can select a subset of Scenarios to run against a candidate rather than always running the full Gym. Selecting a Scenario still fans out to Runs across all applicable historical traces within it — cherry-picking a Scenario is not cherry-picking a single Run.
- FR17. Scoped, Scenario-selected runs are the mode for **local dev iteration** — a fast sanity check against the Scenarios most relevant to a given change (e.g. a context-only prompt edit might warrant just Adversarial + Formatting/Response Styling).
- FR18. The **full Gym — every Scenario — is what runs in CI** and is what a merge-blocking verdict is based on (ties to Phase 2 GitHub Actions integration, `PLAN.md §5.2`). Scoped local runs are for speed during iteration; they are never themselves the merge gate.
- FR19. The Gym Report always discloses which Scenarios were *not* run for a given submission, so a scoped run is never mistaken for full coverage.

## 9. Inputs & outputs contract (product-level)

**In:** `system_prompt.txt` (candidate prompt), `tools.json` (MCP-compatible tool schemas), `traces.json` (historical traces).

**Out:** One **Gym Report** — per-Run absolute verdict and (where applicable) diff classification against baseline, rolled into a pass/fail/warn summary, with explicit disclosure of Scenario coverage.

## 10. User flow (single Gym invocation, walked through)

1. Engineer submits a candidate prompt against an existing Gym, selecting either specific Scenarios (local iteration) or the full Gym (CI gate).
2. Engine validates inputs (FR1–FR3).
3. For each selected Scenario, the engine constructs Runs from historical traces, using the Tool Response Layer to replay, synthesize, or inject failures per FR4–FR6.
4. Each Run executes in isolation with snapshot/rollback support (FR7–FR9), producing a trajectory.
5. Engine assigns each Run's absolute verdict (FR10–FR12) and, where a baseline exists, its diff classification (FR13–FR15).
6. Engine assembles the Gym Report, disclosing Scenario coverage (FR16–FR19).
7. Engineer reads the report, fixes what regressed, and re-runs.

## 11. Success metrics

- **Critical Production Regressions Intercepted** (`PLAN.md §3`) — the north star; this engine is what produces that number.
- **Time to verdict** for a scoped local run vs. a full CI Gym run.
- **False positive rate** — verdicts marked Fail/Regression that turn out, on inspection, to be fine. High false-positive rate kills trust in the engine faster than anything else.

## 12. Edge cases the engine must handle

- Agent attempts a destructive action — must be caught and contained, never actually executed against anything real.
- Agent loops indefinitely or burns an unreasonable number of steps on a simple Run.
- Agent calls a tool with a plausible-but-wrong argument that's schema-valid but semantically wrong — covered for the invariant-checkable subset by FR11a; open-ended cases remain out of MVP scope.
- Candidate takes a legitimately different, equally valid path from history — engine shouldn't blindly flag every divergence as a failure (this is what the Diverged classification in FR14 is for).
- Two runs of the identical candidate against the identical Gym produce different trajectories due to LLM sampling — see open question in §13.

## 13. Open questions

1. **Determinism:** should each Run execute once, or as a majority vote over N samples, to smooth out LLM sampling variance? Directly trades off against time-to-verdict and cost — still unresolved.
   - *MVP: run each Run once. Majority-vote-over-N is deferred; surface the sampling caveat in the report rather than paying the cost up front.*

## 14. MVP prototyping approach (standalone, no production repo)

*Added in review — how to build a first working version of this engine without pushing code into any existing production repo, and exactly which requirements are in the first cut. Nothing above is removed; this section is additive.*

### 14.1 Form factor: a standalone CLI — not a script, not a service

- Build it as its own small, brand-new repo with a single CLI entrypoint (e.g. `simgym run --gym ./mygym --scenarios adversarial,formatting`) — not a script dropped into an existing codebase, and not a deployed service.
- A fresh repo gives the "no production code" property for free: zero coupling to production dependencies, and nothing that can accidentally ship into a live system.
- It stays small because **isolation is free** (see FR7 MVP callout): because every tool is mocked, there is no container runtime, orchestration, or infra to stand up. The whole engine runs on a laptop.
- It is *not* a single script: there are ~6 genuinely distinct responsibilities (validate → build Runs → tool layer → agent loop → verdict → diff/report). One file becomes unwieldy fast; a thin package of small modules does not.

### 14.2 Proposed module layout

```
simgym/
  cli.py         # entrypoint: simgym run --gym ./mygym --scenarios adversarial,formatting
  intake.py      # load + validate the three files            (FR1–FR3)
  toollayer.py   # replay / synthesize / inject               (FR4–FR6)
  scenarios.py   # the §8.2 failure-mode mutators, auto-generated per trace
  runner.py      # agent loop + step/time budget; isolation = mocking   (FR7, FR9)
  verdict.py     # deterministic fails + invariants; LLM-judge for Warn (FR10–FR12)
  diff.py        # candidate vs. fresh baseline                (FR13–FR15)
  report.py      # Gym Report: JSON + rendered HTML, with coverage disclosure (FR16–FR19)
  gyms/example/  # sample system_prompt.txt, tools.json, traces.json
```

### 14.3 MVP cut — deferred vs. kept

**Deferred (original requirement preserved above, just not in the first cut):**
- **Snapshot / rollback (FR8)** — performance optimization for fan-out; the prototype re-runs the trace prefix per variant instead.
- **Determinism / majority vote (§13)** — run each Run once for now.
- **CI wiring, PR bots (§4, FR18 CI mode)** — already Phase 2. The CLI's full-Gym mode is exactly the seam CI will later invoke, so nothing has to change shape when that user arrives.
- **Container / sandbox runtime** — unnecessary while every tool is mocked (FR7 callout).

**Kept — the spine of the prototype:**
- Three-file intake + validation (FR1–FR3).
- Tool Response Layer: replay + synthesize + inject (FR4–FR6).
- Scenario mutators (§8.2), auto-generated per clean trace.
- Agent loop with a step/time budget → non-terminating detection (FR9).
- Deterministic absolute verdict: hallucinated tool, schema-invalid args, non-termination, invariant violations (FR10, FR11, FR11a) — no LLM needed for any hard Fail.
- LLM-as-judge confined to the fuzzy calls only: Warn (FR12) and Diverged (FR14).
- Fresh-baseline diff + classification (FR13–FR15).
- A single Gym Report with explicit scenario-coverage disclosure (FR16–FR19).

### 14.4 Why isolation is free in the MVP (the key insight)

The engine's core mechanic is that the agent never touches a real tool — every tool call is answered by the Tool Response Layer. That means the strong isolation guarantee (FR7, edge cases in §12) is satisfied *by construction*, not by infrastructure: a "drop the table" call is simply a mocked response the engine chooses to return. This is what lets the entire first version be a laptop-runnable CLI with no container/orchestration layer — the single biggest scope reduction available, and it costs nothing in fidelity because the tools were always going to be mocked.

### 14.5 Open items to unblock the build

1. **Which SDK the production agents run on** (Anthropic Python? TS? other) — decides the runner's agent-loop implementation and whether the prototype is written in Python or TS.
2. **A real sample gym** (a system prompt + `tools.json` + a handful of traces) to point it at, or a synthesized toy gym to prove the loop end-to-end on day one.

---
*Status: sections 8.1–8.4 have been through detailed review. Remaining before this is fully locked: the determinism question above, and eventually an engineering HLD constrained by these requirements.*
