# WSS Proposal MCP

**White Space Studio — Interactive Proposal Pricing Tools**

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives Claude the ability to generate interactive HTML pricing calculators and monthly cost tools for client proposals — and save them directly to any folder on your computer.

---

## What it does

This MCP adds three tools to Claude:

| Tool | What it creates |
|---|---|
| `generate_pricing_tool` | A full interactive pricing calculator with milestone breakdown, AI-Accelerated toggle, SENTINEL badges, discount field, and grand total |
| `generate_monthly_costs` | A monthly operating costs calculator with clickable maintenance tiers and AI-assisted maintenance toggle |
| `save_proposal_file` | Saves any HTML string to a specific folder on your computer |

All outputs are standalone `.html` files — open them directly in Chrome, Safari, or Firefox with no server needed.

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/wss-proposal-mcp.git
cd wss-proposal-mcp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add to Claude's MCP config

Open your Claude MCP config file. On Mac it's at:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Add this block inside the `mcpServers` object:

```json
{
  "mcpServers": {
    "wss-proposal": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/wss-proposal-mcp/src/index.js"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/wss-proposal-mcp` with the actual path where you cloned this repo. For example:

```json
"args": ["/Users/marlon/Projects/wss-proposal-mcp/src/index.js"]
```

### 4. Restart Claude

Quit and reopen the Claude desktop app. The tools will be available automatically.

---

## Usage examples

### Generate a pricing tool

Just describe the project in plain English:

> "Use the wss-proposal MCP to create a pricing tool for a client called BrightPath Academy. They want a web app — student portal with video lessons and quizzes. Budget around $40k USD. Save it to my Desktop."

Or give Claude a detailed breakdown:

> "Generate a pricing tool: client = Mercado Fresh, project = Grocery Delivery App, currency = PHP. Milestones: Foundation (Weeks 1–3) with Architecture ₱45000, DB Design ₱60000, Auth ₱55000. Core Features (Weeks 4–8) with Booking UI ₱120000 ai_discount 0.50, Matching Algorithm ₱140000 ai_discount 0.32. Payment Integration ₱95000 ai_discount 0.27 sentinel=true. Save to /Users/marlon/Documents/Proposals."

### Generate monthly costs

> "Create a monthly costs tool for TM Rideshare. Services: AWS ₱6440/mo, Google Maps ₱8400/mo (scales with usage), SMS ₱4180/mo. Maintenance tiers: Basic ₱30000 AI ₱18000, Standard ₱55000 AI ₱33000, Premium ₱90000 AI ₱55000. Add a PayMongo note. Save to /Users/marlon/Documents/Proposals."

---

## AI-Accelerated pricing

The pricing tool includes an **AI-Accelerated toggle** that shows how much less each feature costs when built with AI-assisted development (vibe coding) + Sentinel security review.

Recommended discount rates by work type are built into the tool:

| Category | AI Discount |
|---|---|
| UI/UX shells and screens | 50–55% |
| Backend API scaffolding | 45–52% |
| Admin dashboards | 48–55% |
| Database design | 40–45% |
| Auth systems (Firebase etc.) | 38–42% |
| Payment integrations | 25–30% *(SENTINEL)* |
| Architecture planning | 12–15% |
| QA testing | 28–32% |

Pass `ai_discount` as a decimal (e.g. `0.45` for 45%) on each line item.

---

## SENTINEL items

Items where payment flows, security tokens, or financial calculations are involved should be flagged with `"sentinel": true`. This adds a 🛡 SENTINEL badge and shows a notice explaining that these items require a human code review even when AI-generated — checking webhook signatures, idempotency, currency precision, and token handling.

---

## File structure

```
wss-proposal-mcp/
├── src/
│   └── index.js          ← MCP server + HTML generators
├── package.json
└── README.md
```

---

## Requirements

- Node.js 18+
- Claude desktop app with MCP support

---

## License

MIT — free to use and modify for your own proposals.

---

*Built by [White Space Studio](mailto:brow5187@gmail.com)*
