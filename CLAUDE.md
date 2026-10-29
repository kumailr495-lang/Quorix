# Quorix

The owner works from an Android phone through Claude Code cloud sessions. Never suggest installing desktop software; prefer browser/cloud tooling.

## Creative toolkit (declared in `.claude/settings.json`)

| Plugin | Use it for |
|---|---|
| `impeccable` | `/impeccable polish`, `audit`, `critique` and other commands: frontend design quality and anti-pattern checks |
| `ui-ux-pro-max` | Style, color, typography, and UX databases; stack guides incl. Three.js, React, Tailwind, Flutter |
| `superpowers` | brainstorming, writing-plans, TDD, systematic-debugging, verification-before-completion |
| `example-skills` | frontend-design, algorithmic-art (p5.js), canvas-design, webapp-testing, theme-factory, web-artifacts-builder, slack-gif-creator |
| `ecc` | Large agent/skill library (408 skills, 71 agents, 8 hooks). Costs ~47k tokens per session |
| `ponytail` | Pushes toward the simplest working solution; `ponytail-review`, `ponytail-audit` |
| `codeburn` | `/cost`: AI coding usage and cost report |
| `headroom` | Marketplace registered but **not enabled**: needs its local compression proxy |
| skill `prompt-master` | Writes optimized prompts for other AI tools (Midjourney, Cursor, etc.) |
| skill `compact-summary` | Say **COMPACT** for a 5-7 bullet copy-paste handoff of the conversation |
| code-review-graph, graphify | Code knowledge graphs (MCP server + hooks). CLIs reinstalled at session start by `.claude/hooks/install-tools.sh` |

## Cloud container notes

- Chromium is preinstalled. Node `require('playwright')` works with no options.
- Python Playwright (pip) must be pointed at the bundled browser:
  `chromium.launch(executable_path='/opt/pw-browsers/chromium-1243/chrome-linux64/chrome')`
- WebGL/Three.js renders headless with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- Available: ffmpeg, ImageMagick (`convert`), Pillow, numpy, uv, bun. No Blender/GIMP/Inkscape (desktop apps).
- pip packages do not persist between sessions; reinstall as needed:
  `pip3 install playwright imageio scikit-image opencv-python-headless trimesh opensimplex`

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**This project has a knowledge graph. Start with the code-review-graph
MCP tools to narrow scope, then read the source.** The graph is cheaper than scanning files and
gives you structural context (callers, dependents, test coverage) that file search cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

### Verify in the source

- Narrow scope with the graph, then read the source. Do not change code from graph output alone.
- For any non-trivial change, read the implementation and the relevant tests before concluding.
- Verify the exact source when touching behavior, database logic, migrations, retries, fallbacks,
  recovery, or compatibility code.
- When the graph and the source disagree, the source wins. The graph may be stale or may not
  model that relationship.
- An empty graph result can mean "not indexed" or "not statically visible", not "does not exist".

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.
<!-- /code-review-graph MCP tools -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
