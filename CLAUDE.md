# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Behavioral Guidelines (from Andrej Karpathy Skills)

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Project Structure

### 1. Docs
- `docs/superpowers/specs/` — design specifications
- `docs/superpowers/plans/` — implementation plans
- `docs/superpowers/` — general project documentation

### 2. Packaging Optimizer (`包装装载优化软件/`)
A Vite + React 19 SPA for carton → box → pallet load optimization with 3D visualization.

**Commands:**
- `pnpm build` — production build to `dist/`
- `pnpm dev` — start Vite dev server
- `pnpm test` — run tests

**Stack:** React 19, Vite 8, TypeScript 6, Three.js, Zustand, Tailwind CSS 4

**Deploy to Aliyun (https://k3-aitable.xyz/):**
```bash
# 1. Build
cd "包装装载优化软件" && pnpm build

# 2. Upload to correct Nginx root
scp -r dist/* aliyun:/var/www/packing-optimizer/

# 3. Reload Nginx
ssh aliyun "systemctl reload nginx"
```
Or simply: `bash deploy.sh`

**Access:**
- Main: https://k3-aitable.xyz/ (HTTPS, port 443)
- Fallback: http://106.14.200.249:8080/ (direct IP, no SSL)

⚠️ **Nginx root 是 `/var/www/packing-optimizer/`（注意：packing 不是 packaging），不要传错路径。**

### 3. Skills (`claude/skills/`)
Custom Claude Code skills for PPTX generation and research-to-slides workflows.
