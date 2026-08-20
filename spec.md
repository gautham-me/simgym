# SimGym: Core Product Specification

Last updated: August 20, 2026

## 1. What SimGym Is

SimGym is a platform to test and improve AI agents. It takes a continual-learning approach: import an agent's workspace, evaluate it in a simulated environment, and feed the results back into targeted prompt improvements. The platform is built as a developer tool. It runs through a CLI, on the developer's own terminal, against the developer's own cloud.

## 2. Importing an Agent

A user brings their agent's workspace into SimGym. The agent typically runs on a Claude harness or a Codex harness, depending on the agent's design. SimGym imports this workspace as the starting point for every test that follows.

### 2.1 Custom Variables

The imported workspace often contains custom variables: placeholders within its files for dynamic context that gets injected into the agent at run time. This includes information about the user, the user's assets, memory from prior interactions, and similar context an agent would receive in production. A bench can define values for these variables per task, alongside the mock tool environment.

## 3. Mock Tool Environments

Once an agent is imported, SimGym sets up a mock tool environment around it. This environment models the MCP servers and tools the agent depends on, so the agent can be run and observed without touching real, live systems.

## 4. The Bench

A bench is a dataset for testing an agent. It holds a collection of tasks.

### 4.1 Tasks

Each task has three parts:

- **User input.** The prompt or request the agent receives.
- **Agent workspace and environment.** The imported workspace, paired with a mock tool environment configured for this task, including which tool calls succeed and which fail.
- **Rubrics.** The criteria the task should be graded against.

### 4.2 Running a Task

With these three parts in place, SimGym runs the agent inside the simulated environment and records its trajectory: every step the agent takes, from input to tool calls to final output.

### 4.3 Grading

Each task's rubrics are checked against the agent's trajectory. The result is a score for that task, reflecting how well the agent met the rubric's criteria.

## 5. Reports

Running a bench produces a report. The report states the outcome of the test and points to the areas where the agent underperforms.

## 6. Signals

A report's areas of underperformance are called signals. Before running the improvement loop, the user selects a few signals to work on.

## 7. The Improvement Loop

The improvement loop is an agentic loop that progressively tweaks the agent's prompt to raise its bench score. It acts only on the signals the user selected, and it is built to avoid solving for signals the user did not select. If a bench scores 60% and flags five weak areas, and the user picks those five as signals, the improvement loop works to bring the score from 60% toward something like 90%, on those signals specifically.

The improvement loop's output is a pull request: a draft of the agent's workspace with the prompt changes that raise its performance. The user reviews this draft before it goes anywhere near production.

## 8. The Flywheel

The full loop, end to end: import an agent, build a mock tool environment, assemble a bench of tasks with rubrics and custom variables, run the agent and grade its trajectories, review the report, pick signals, run the improvement loop, and get back a PR with the prompt fix. Feeding more traces from production back into the bench closes the loop: the bench keeps getting sharper, and the agent keeps improving alongside it.

## 9. The SimGym CLI

The CLI is the primary way developers work with SimGym, on their own terminal. It supports:

- Importing an agent into the system.
- Running tests (bench runs) against an agent.
- Running improvement loops.
- Viewing the results of an improvement loop.
- Fetching improved drafts and applying them to a production instance.

A cloud-based SaaS UI sits alongside the CLI for parts of the workflow, built on the same APIs as the CLI. The CLI remains the interface the product is built around, and every core action is available through it.

## 10. Bring Your Own Cloud

SimGym is infrastructure. It is designed to run in a bring-your-own-cloud model: the agent, its tool environment, and its test runs operate on infrastructure the customer controls, rather than on infrastructure SimGym owns.

## 11. Collaboration: Branching

Collaborating on an agent's prompt is a central part of the product. SimGym takes a Git-like, branch-based approach to this collaboration:

- A developer working on a prompt iteration or a test run works on their own branch.
- Different developers can work on different branches at the same time, without interfering with each other.
- Each bench result and each test run is scoped to the branch it was run on.
- Each improvement loop is scoped to the branch it was run on.
- Branches can be merged, bringing separate developers' prompt work back together.

This gives teams the same workflow around prompts that they already have around code: isolate changes on a branch, test and improve them independently, and merge once they're ready.
