# Actionable Improvement Proposal for oh-my-codex (OMX)

**Date:** April 2026
**Focus:** Context Management, Prompt Engineering, MCP Advancements, and Local-First Agentic Workflows.

## 1. Industry Context & Competitor Landscape (2026)

The landscape of AI coding assistants has evolved from simple autocomplete to autonomous, agentic systems. In 2026, the primary differentiators between tools are **context management**, **reasoning frameworks**, and **tool utilization**.

### Cross-Comparison

| Tool | Core Philosophy | Context Management | Tooling / Execution | Safety & Privacy |
| :--- | :--- | :--- | :--- | :--- |
| **Aider** | Local, Terminal-based, open-source | **Repository Maps (Tree-Sitter/AST)**: creates a concise index of symbols instead of dumping files. | Native git integration, direct file editing. | High (local context building). |
| **Claude Code** | Terminal-based Autonomous Agent | Deep project understanding via agentic exploration. | Autonomous CLI execution, file modification. | Medium (relies heavily on Anthropic cloud models). |
| **Cursor / Windsurf** | AI-Native IDE | RAG across workspace, vector search, active file context. | IDE-integrated multi-file edits, inline predictions. | Medium (cloud dependency for advanced features). |
| **OMX (Current)** | Workflow layer over Codex CLI | relies on underlying Codex CLI context limits + some regex-based code-intel. | Deep MCP integration, durable tmux team sessions. | High (local first, user brings API key). |

### Where OMX Shines
- **Durable Team Runtime:** The `$team` and `$ralph` multi-agent coordination using `tmux` workspaces is highly advanced.
- **MCP Extensibility:** Existing `omx-code-intel` and `omx-memory` servers are forward-looking.

### Where OMX Needs Improvement
- **The "Context Window Trap":** Relying solely on the LLM's context window by reading full files leads to cost explosion and attention degradation. OMX needs structural awareness.
- **Search vs. Structure:** Regex-based symbol extraction in `code-intel-server.ts` is brittle compared to mature AST parsing (like Tree-sitter or advanced AST-grep).

## 2. Actionable Improvements & Implementation Plan

### Improvement 1: Implementation of "Repository Maps"
**The Problem:** Agents currently guess file paths or read entire files to find how functions interact, wasting tokens and polluting the context window with irrelevant implementations.
**The Solution:** Introduce a **Repository Map** (inspired by Aider).
- **Mechanism:** Extract the structural skeleton of the project (classes, method signatures, exports) and build a compressed representation.
- **Actionable Step:** Implement a new MCP tool `generate_repo_map` in `code-intel-server.ts`. When an agent needs to understand the project structure, it fetches this map. It shows *where* things are defined, without showing *how* they are implemented.

### Improvement 2: Enhanced Code Intelligence & Regex Parsing
**The Problem:** The current `extractSymbols` in `code-intel-server.ts` uses regex patterns, which fails on complex syntax like modern TypeScript arrow functions.
**The Solution:** Enhance the regex-based symbol extraction to capture more robust constructs without introducing heavy AST dependencies that slow down local execution.
- **Actionable Step:** Upgrade the MCP server to provide a structured `lsp_repo_map` that traverses the directory tree and builds a lightweight structural outline of the codebase, capturing arrow functions and classes more accurately.

### Improvement 3: Prompt Engineering for Context Strategies (CoT / Reasoning)
**The Problem:** LLMs often hallucinate file paths or try to write code without verifying existing utilities.
**The Solution:** Guide the agent's reasoning via prompts.
- **Actionable Step:** Update the base prompts/`AGENTS.md` instructions to mandate a "Map-then-Read" strategy. Agents must be instructed to:
  1. Call `lsp_repo_map` or `lsp_workspace_symbols` to find the relevant file.
  2. Read only the specific files or use `ast_grep_search` to verify definitions.
  3. Propose changes.

### Improvement 4: Local-First Safety & Isolation
**The Problem:** Autonomous agents can wreak havoc if they execute destructive CLI commands or leak data.
**The Solution:** Emphasize local MCP servers over external APIs.
- **Actionable Step:** Ensure all new context generation (Repo Maps) happens purely locally (no external RAG embeddings sent to cloud providers). The Repo Map is generated on-the-fly via local Node/AST tools and passed in the prompt context.

## 3. Measurable Impact
- **Reduced Token Usage:** By providing a Repo Map instead of reading 5 full files, input tokens decrease significantly, leading to faster responses and lower costs.
- **Higher First-Try Success Rate:** Accurate context prevents the LLM from hallucinating APIs or missing existing project conventions.
- **No Regressions:** These features are additive. If the Repo Map fails or is too large, the system falls back to standard file-reading behavior.

---
*The immediate next steps involve coding the Repository Map generator into the MCP layer and exposing it to the agent workflows.*