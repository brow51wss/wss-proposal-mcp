#!/usr/bin/env node
/**
 * WSS Proposal MCP Server
 * White Space Studio — Interactive Proposal Pricing Tools
 *
 * Tools:
 *   generate_pricing_tool     → Milestone-based dev cost calculator HTML
 *   generate_monthly_costs    → Monthly ops + maintenance HTML
 *   save_proposal_file        → Save any HTML string to disk
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// HTML GENERATOR — PRICING TOOL
// ─────────────────────────────────────────────────────────────────────────────

function generatePricingHTML(params) {
  const {
    client_name,
    project_name,
    project_description = "",
    currency = "PHP",
    milestones,
    include_monthly_costs_link = false,
  } = params;

  const symbol = currency === "USD" ? "$" : "₱";
  const round = currency === "USD"
    ? (n) => Math.round(n / 100) * 100
    : (n) => Math.round(n / 1000) * 1000;

  // Pre-calculate AI prices
  const milestonesWithAI = milestones.map((m) => ({
    ...m,
    items: m.items.map((item) => ({
      ...item,
      ai_price: round(item.price * (1 - (item.ai_discount ?? 0.4))),
    })),
  }));

  const dataJson = JSON.stringify(milestonesWithAI);

  const fileName = `${client_name.replace(/\s+/g, "_")}_${project_name.replace(/\s+/g, "_")}_Pricing.html`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${client_name} — ${project_name} Pricing</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Poppins', sans-serif; background: #f0f4f8; color: #1a1a2e; min-height: 100vh; }

  /* Layout */
  .container { max-width: 820px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

  /* Hero */
  .hero { background: #0073AA; color: #fff; border-radius: 14px; padding: 2rem 2.5rem; margin-bottom: 1.5rem; }
  .hero h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 0.25rem; }
  .hero .meta { font-size: 0.85rem; opacity: 0.85; }
  .hero .desc { font-size: 0.9rem; margin-top: 0.75rem; opacity: 0.9; }

  /* Mode bar */
  .mode-bar { background: #fff; border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
  .mode-label { font-size: 0.9rem; font-weight: 600; color: #1a1a2e; }
  .toggle-wrap { display: flex; align-items: center; gap: 0.6rem; }
  .toggle-wrap span { font-size: 0.82rem; color: #4a4a68; }
  .toggle { position: relative; display: inline-block; width: 48px; height: 26px; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; inset: 0; background: #c9d6df; border-radius: 26px; cursor: pointer; transition: 0.3s; }
  .slider::before { content: ''; position: absolute; width: 20px; height: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
  input:checked + .slider { background: #0073AA; }
  input:checked + .slider::before { transform: translateX(22px); }

  /* Savings banner */
  .savings-banner { background: #e8f5f1; border: 1px solid #0f6e56; border-radius: 10px; padding: 0.75rem 1.25rem; margin-bottom: 1rem; color: #0f6e56; font-size: 0.88rem; font-weight: 500; display: none; }
  .sentinel-notice { background: #fff8f0; border: 1px solid #B87333; border-radius: 10px; padding: 0.75rem 1.25rem; margin-bottom: 1rem; color: #7a4a1a; font-size: 0.82rem; display: none; }

  /* Summary cards */
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  @media (max-width: 600px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
  .summary-card { background: #fff; border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; padding: 1.25rem 1rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .summary-card .label { font-size: 0.72rem; color: #8888a8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.4rem; }
  .summary-card .value { font-size: 1.3rem; font-weight: 700; color: #0073AA; }
  .summary-card .sub { font-size: 0.75rem; color: #8888a8; margin-top: 0.2rem; }

  /* Milestone cards */
  .milestone { background: #fff; border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04); overflow: hidden; }
  .milestone-header { display: flex; align-items: center; gap: 0.9rem; padding: 1rem 1.25rem; cursor: pointer; user-select: none; }
  .badge { background: #0073AA; color: #fff; font-size: 0.72rem; font-weight: 700; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .milestone-header h3 { font-size: 0.95rem; font-weight: 600; flex: 1; }
  .milestone-meta { font-size: 0.78rem; color: #8888a8; white-space: nowrap; }
  .chevron { font-size: 0.85rem; color: #8888a8; transition: transform 0.2s; }
  .milestone.open .chevron { transform: rotate(180deg); }
  .milestone-body { display: none; border-top: 1px solid rgba(0,0,0,0.07); }
  .milestone.open .milestone-body { display: block; }

  /* Line items */
  .line-item { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 1rem; padding: 0.75rem 1.25rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
  .line-item:nth-child(even) { background: rgba(0,115,170,0.02); }
  .line-item:last-child { border-bottom: none; }
  .item-info .item-name { font-size: 0.88rem; font-weight: 600; color: #1a1a2e; }
  .item-info .item-desc { font-size: 0.78rem; color: #8888a8; margin-top: 0.2rem; }
  .sentinel-badge { display: inline-flex; align-items: center; gap: 0.3rem; background: #fff3e0; color: #B87333; border: 1px solid #B87333; border-radius: 4px; font-size: 0.68rem; font-weight: 600; padding: 2px 6px; margin-left: 0.4rem; }
  .item-price-wrap { text-align: right; }
  .strikethrough { font-size: 0.75rem; color: #A32D2D; text-decoration: line-through; display: none; margin-bottom: 0.2rem; }
  .price-input { width: 130px; border: 1px solid rgba(0,0,0,0.18); border-radius: 8px; padding: 0.4rem 0.6rem; font-family: 'Poppins', sans-serif; font-size: 0.88rem; font-weight: 600; color: #1a1a2e; text-align: right; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
  .price-input:focus { border-color: #0073AA; box-shadow: 0 0 0 3px rgba(0,115,170,0.12); }
  .milestone-subtotal { padding: 0.75rem 1.25rem; background: #f5f7fa; text-align: right; font-size: 0.82rem; color: #4a4a68; font-weight: 600; border-top: 1px solid rgba(0,0,0,0.07); }

  /* Discount row */
  .discount-row { background: #fff; border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .discount-row label { font-size: 0.88rem; font-weight: 500; color: #4a4a68; }
  .discount-right { display: flex; align-items: center; gap: 0.75rem; }
  .pct-input { width: 70px; border: 1px solid rgba(0,0,0,0.18); border-radius: 8px; padding: 0.4rem 0.6rem; font-family: 'Poppins', sans-serif; font-size: 0.88rem; text-align: right; outline: none; }
  .pct-input:focus { border-color: #0073AA; box-shadow: 0 0 0 3px rgba(0,115,170,0.12); }
  .discount-amount { font-size: 0.88rem; font-weight: 600; color: #A32D2D; min-width: 120px; text-align: right; }

  /* Grand total */
  .grand-total-bar { background: #0073AA; color: #fff; border-radius: 12px; padding: 1.5rem 2rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  .grand-total-bar .gt-label { font-size: 1rem; font-weight: 500; opacity: 0.85; }
  .grand-total-bar .gt-value { font-size: 2rem; font-weight: 700; }

  /* Buttons */
  .btn-confirm { width: 100%; padding: 1rem; background: #0073AA; color: #fff; border: none; border-radius: 10px; font-family: 'Poppins', sans-serif; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-bottom: 0.75rem; }
  .btn-confirm:hover { background: #005a88; }
  .btn-reset { width: 100%; padding: 0.8rem; background: transparent; color: #0073AA; border: 1.5px solid #0073AA; border-radius: 10px; font-family: 'Poppins', sans-serif; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: background 0.2s; }
  .btn-reset:hover { background: #C2E1EE; }

  /* Footer */
  .footer { text-align: center; margin-top: 2.5rem; font-size: 0.75rem; color: #8888a8; }

  /* Confirmation state */
  .confirm-msg { display: none; background: #e8f5f1; border: 1.5px solid #0f6e56; border-radius: 10px; padding: 1rem 1.5rem; text-align: center; color: #0f6e56; font-weight: 600; margin-bottom: 0.75rem; }
</style>
</head>
<body>
<div class="container">

  <!-- Hero -->
  <div class="hero">
    <h1>${project_name} — Client Proposal</h1>
    <div class="meta">Client: ${client_name} &nbsp;·&nbsp; Pricing in ${currency} (${symbol})</div>
    ${project_description ? `<div class="desc">${project_description}</div>` : ""}
  </div>

  <!-- Mode bar -->
  <div class="mode-bar">
    <div>
      <div class="mode-label" id="modeLabel">Standard Rate</div>
      <div style="font-size:0.78rem;color:#8888a8;margin-top:2px">Toggle to see AI-Accelerated pricing</div>
    </div>
    <div class="toggle-wrap">
      <span>Standard</span>
      <label class="toggle">
        <input type="checkbox" id="aiToggle">
        <span class="slider"></span>
      </label>
      <span>AI-Accelerated</span>
    </div>
  </div>

  <div class="savings-banner" id="savingsBanner"></div>
  <div class="sentinel-notice" id="sentinelNotice">
    🛡 <strong>Sentinel Review Active:</strong> Items marked SENTINEL contain payment flows, security tokens, or financial calculations. Even with AI-generated code, a developer manually reviews named code patterns: webhook signature checks, duplicate-event handling, currency precision, and token security. This is why those items carry a smaller AI discount.
  </div>

  <!-- Summary cards -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Total Investment</div>
      <div class="value" id="cardTotal">—</div>
      <div class="sub" id="cardTotalSub">before discount</div>
    </div>
    <div class="summary-card">
      <div class="label">After Discount</div>
      <div class="value" id="cardAfterDiscount">—</div>
      <div class="sub" id="cardDiscountSub">0% applied</div>
    </div>
    <div class="summary-card">
      <div class="label">Timeline</div>
      <div class="value" id="cardTimeline">—</div>
      <div class="sub" id="cardTimelineSub">estimated</div>
    </div>
    <div class="summary-card">
      <div class="label" id="cardFourLabel">Total Features</div>
      <div class="value" id="cardFour">—</div>
      <div class="sub" id="cardFourSub">across all milestones</div>
    </div>
  </div>

  <!-- Milestones -->
  <div id="milestonesContainer"></div>

  <!-- Discount row -->
  <div class="discount-row">
    <label>Discount</label>
    <div class="discount-right">
      <input type="number" class="pct-input" id="discountPct" value="0" min="0" max="100" step="1"> %
      <div class="discount-amount" id="discountAmount">− ${symbol}0</div>
    </div>
  </div>

  <!-- Grand total -->
  <div class="grand-total-bar">
    <div class="gt-label">Grand Total</div>
    <div class="gt-value" id="grandTotal">—</div>
  </div>

  <!-- Buttons -->
  <div class="confirm-msg" id="confirmMsg">✓ Pricing confirmed! Share this file or use it as the basis for your proposal.</div>
  <button class="btn-confirm" id="confirmBtn">Confirm & Approve Pricing</button>
  <button class="btn-reset" id="resetBtn">↺ Reset to Defaults</button>

  <div class="footer">Prepared by White Space Studio &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
</div>

<script>
const CURRENCY_SYMBOL = "${symbol}";
const DATA = ${dataJson};

// Pre-calculate standard and AI prices
const STD_PRICES = DATA.map(m => m.items.map(i => i.price));
const AI_PRICES  = DATA.map(m => m.items.map(i => i.ai_price));

let isAI = false;

function fmt(n) {
  return CURRENCY_SYMBOL + n.toLocaleString();
}

// Build milestone cards
function buildMilestones() {
  const container = document.getElementById('milestonesContainer');
  DATA.forEach((m, mi) => {
    const card = document.createElement('div');
    card.className = 'milestone open';
    card.id = 'ms_' + mi;

    const totalItems = m.items.length;
    card.innerHTML = \`
      <div class="milestone-header" onclick="toggleMilestone(\${mi})">
        <div class="badge">\${mi + 1}</div>
        <h3>\${m.title}</h3>
        <div class="milestone-meta">\${m.weeks || ''} &nbsp;·&nbsp; \${totalItems} item\${totalItems !== 1 ? 's' : ''}</div>
        <span class="chevron">▾</span>
      </div>
      <div class="milestone-body" id="body_\${mi}">
        <div id="items_\${mi}"></div>
        <div class="milestone-subtotal" id="subtotal_\${mi}"></div>
      </div>
    \`;
    container.appendChild(card);
    buildItems(mi);
  });
}

function buildItems(mi) {
  const container = document.getElementById('items_' + mi);
  container.innerHTML = '';
  DATA[mi].items.forEach((item, ii) => {
    const prices = isAI ? AI_PRICES : STD_PRICES;
    const stdP = STD_PRICES[mi][ii];
    const row = document.createElement('div');
    row.className = 'line-item';
    row.innerHTML = \`
      <div class="item-info">
        <div class="item-name">
          \${item.name}
          \${item.sentinel ? '<span class="sentinel-badge">🛡 SENTINEL</span>' : ''}
        </div>
        <div class="item-desc">\${item.description || ''}</div>
      </div>
      <div class="item-price-wrap">
        <div class="strikethrough" id="strike_\${mi}_\${ii}">\${fmt(stdP)}</div>
        <input type="number" class="price-input" id="inp_\${mi}_\${ii}"
          value="\${prices[mi][ii]}" min="0" step="1000"
          oninput="updateAll()">
      </div>
    \`;
    container.appendChild(row);
  });
}

function toggleMilestone(mi) {
  const card = document.getElementById('ms_' + mi);
  card.classList.toggle('open');
}

function getTotal() {
  let total = 0;
  DATA.forEach((m, mi) => {
    m.items.forEach((_, ii) => {
      const inp = document.getElementById('inp_' + mi + '_' + ii);
      if (inp) total += parseFloat(inp.value) || 0;
    });
  });
  return total;
}

function updateAll() {
  const total = getTotal();
  const pct = parseFloat(document.getElementById('discountPct').value) || 0;
  const discountAmt = Math.round(total * pct / 100);
  const afterDiscount = total - discountAmt;

  document.getElementById('cardTotal').textContent = fmt(total);
  document.getElementById('cardAfterDiscount').textContent = fmt(afterDiscount);
  document.getElementById('cardDiscountSub').textContent = pct + '% applied';
  document.getElementById('discountAmount').textContent = '− ' + fmt(discountAmt);
  document.getElementById('grandTotal').textContent = fmt(afterDiscount);

  // Milestone subtotals
  DATA.forEach((m, mi) => {
    let sub = 0;
    m.items.forEach((_, ii) => {
      const inp = document.getElementById('inp_' + mi + '_' + ii);
      if (inp) sub += parseFloat(inp.value) || 0;
    });
    const el = document.getElementById('subtotal_' + mi);
    if (el) el.textContent = 'Subtotal: ' + fmt(sub);
  });

  // AI savings banner
  if (isAI) {
    let stdTotal = 0;
    STD_PRICES.forEach(row => row.forEach(p => stdTotal += p));
    const saved = stdTotal - total;
    const pctSaved = Math.round(saved / stdTotal * 100);
    document.getElementById('savingsBanner').textContent =
      '⚡ AI-Accelerated: You save ' + fmt(saved) + ' (' + pctSaved + '%) vs standard rate';
  }
}

function applyAI(on) {
  isAI = on;
  document.getElementById('modeLabel').textContent = on ? 'AI-Accelerated Rate' : 'Standard Rate';
  document.getElementById('savingsBanner').style.display = on ? 'block' : 'none';
  document.getElementById('sentinelNotice').style.display = on ? 'block' : 'none';

  // Update summary card 4
  document.getElementById('cardFourLabel').textContent = on ? 'AI Savings' : 'Total Features';
  if (on) {
    let stdTotal = 0;
    STD_PRICES.forEach(row => row.forEach(p => stdTotal += p));
    let aiTotal = 0;
    AI_PRICES.forEach(row => row.forEach(p => aiTotal += p));
    document.getElementById('cardFour').textContent = fmt(stdTotal - aiTotal);
    document.getElementById('cardFourSub').textContent = 'vs standard rate';
  } else {
    const totalFeatures = DATA.reduce((acc, m) => acc + m.items.length, 0);
    document.getElementById('cardFour').textContent = totalFeatures;
    document.getElementById('cardFourSub').textContent = 'across all milestones';
  }

  // Swap inputs and strikethroughs
  DATA.forEach((m, mi) => {
    m.items.forEach((item, ii) => {
      const inp = document.getElementById('inp_' + mi + '_' + ii);
      const strike = document.getElementById('strike_' + mi + '_' + ii);
      if (inp) inp.value = on ? AI_PRICES[mi][ii] : STD_PRICES[mi][ii];
      if (strike) strike.style.display = on ? 'block' : 'none';
    });
  });

  // Timeline
  const weeks = DATA.reduce((max, m) => {
    const match = (m.weeks || '').match(/Weeks? (\\d+)[–-](\\d+)/i);
    if (match) return Math.max(max, parseInt(match[2]));
    return max;
  }, 0);
  const aiWeeks = weeks ? Math.round(weeks * 0.6) : null;
  document.getElementById('cardTimeline').textContent = (on && aiWeeks) ? '~' + aiWeeks + ' wks' : (weeks ? '~' + weeks + ' wks' : '—');
  document.getElementById('cardTimelineSub').textContent = on ? 'AI-accelerated' : 'estimated';

  updateAll();
}

// Init
document.getElementById('aiToggle').addEventListener('change', (e) => applyAI(e.target.checked));
document.getElementById('discountPct').addEventListener('input', updateAll);

document.getElementById('confirmBtn').addEventListener('click', () => {
  document.getElementById('confirmMsg').style.display = 'block';
  document.getElementById('confirmBtn').textContent = '✓ Pricing Approved';
  document.getElementById('confirmBtn').style.background = '#0f6e56';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  document.getElementById('aiToggle').checked = false;
  document.getElementById('discountPct').value = 0;
  document.getElementById('confirmMsg').style.display = 'none';
  document.getElementById('confirmBtn').textContent = 'Confirm & Approve Pricing';
  document.getElementById('confirmBtn').style.background = '#0073AA';
  applyAI(false);
});

// Timeline init
const maxWeek = DATA.reduce((max, m) => {
  const match = (m.weeks || '').match(/Weeks? (\\d+)[–-](\\d+)/i);
  if (match) return Math.max(max, parseInt(match[2]));
  return max;
}, 0);
document.getElementById('cardTimeline').textContent = maxWeek ? '~' + maxWeek + ' wks' : '—';

// Feature count init
const totalFeatures = DATA.reduce((acc, m) => acc + m.items.length, 0);
document.getElementById('cardFour').textContent = totalFeatures;

buildMilestones();
updateAll();
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML GENERATOR — MONTHLY COSTS
// ─────────────────────────────────────────────────────────────────────────────

function generateMonthlyCostsHTML(params) {
  const {
    client_name,
    project_name,
    currency = "PHP",
    service_sections,
    maintenance_tiers,
    paymongo_note = null,
  } = params;

  const symbol = currency === "USD" ? "$" : "₱";
  const servicesJson = JSON.stringify(service_sections);
  const tiersJson = JSON.stringify(maintenance_tiers);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${client_name} — Monthly Operating Costs</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Poppins', sans-serif; background: #f0f4f8; color: #1a1a2e; min-height: 100vh; }
  .container { max-width: 820px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
  .hero { background: #0073AA; color: #fff; border-radius: 14px; padding: 2rem 2.5rem; margin-bottom: 1.5rem; }
  .hero h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
  .hero .meta { font-size: 0.85rem; opacity: 0.85; }
  .card { background: #fff; border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04); overflow: hidden; }
  .card-header { padding: 1rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.07); display: flex; justify-content: space-between; align-items: center; }
  .card-header h3 { font-size: 0.95rem; font-weight: 600; }
  .card-header .section-total { font-size: 0.88rem; font-weight: 600; color: #0073AA; }
  .service-row { display: flex; justify-content: space-between; align-items: start; padding: 0.75rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.05); gap: 1rem; }
  .service-row:last-child { border-bottom: none; }
  .service-info .service-name { font-size: 0.88rem; font-weight: 600; }
  .service-info .service-desc { font-size: 0.78rem; color: #8888a8; margin-top: 0.2rem; }
  .service-info .scale-warn { color: #B87333; font-size: 0.75rem; margin-top: 0.2rem; }
  .price-input { width: 130px; border: 1px solid rgba(0,0,0,0.18); border-radius: 8px; padding: 0.4rem 0.6rem; font-family: 'Poppins', sans-serif; font-size: 0.88rem; font-weight: 600; text-align: right; outline: none; transition: border-color 0.2s; }
  .price-input:focus { border-color: #0073AA; box-shadow: 0 0 0 3px rgba(0,115,170,0.12); }

  /* Maintenance tiers */
  .tiers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding: 1.25rem; }
  @media (max-width: 600px) { .tiers-grid { grid-template-columns: 1fr; } }
  .tier-card { border: 2px solid rgba(0,0,0,0.10); border-radius: 10px; padding: 1.25rem 1rem; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
  .tier-card.selected { border-color: #0073AA; box-shadow: 0 0 0 3px rgba(0,115,170,0.15); }
  .tier-card .tier-name { font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8888a8; margin-bottom: 0.4rem; }
  .tier-card .tier-price { font-size: 1.4rem; font-weight: 700; color: #0073AA; }
  .tier-card .tier-price-ai { font-size: 1rem; font-weight: 600; color: #0f6e56; display: none; }
  .tier-card .tier-strike { font-size: 0.8rem; color: #A32D2D; text-decoration: line-through; display: none; }
  .tier-card .tier-desc { font-size: 0.78rem; color: #8888a8; margin-top: 0.6rem; line-height: 1.5; }

  /* AI toggle */
  .mode-bar { background: #fff; border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
  .mode-label { font-size: 0.9rem; font-weight: 600; }
  .toggle-wrap { display: flex; align-items: center; gap: 0.6rem; font-size: 0.82rem; color: #4a4a68; }
  .toggle { position: relative; display: inline-block; width: 48px; height: 26px; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; inset: 0; background: #c9d6df; border-radius: 26px; cursor: pointer; transition: 0.3s; }
  .slider::before { content: ''; position: absolute; width: 20px; height: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
  input:checked + .slider { background: #0073AA; }
  input:checked + .slider::before { transform: translateX(22px); }
  .ai-banner { background: #e8f5f1; border: 1px solid #0f6e56; border-radius: 10px; padding: 0.75rem 1.25rem; margin-bottom: 1rem; color: #0f6e56; font-size: 0.85rem; display: none; }

  /* PayMongo callout */
  .amber-callout { background: #fff8f0; border: 1px solid #B87333; border-radius: 10px; padding: 1rem 1.5rem; margin-bottom: 1rem; }
  .amber-callout strong { color: #7a4a1a; }
  .amber-callout p { font-size: 0.82rem; color: #7a4a1a; margin-top: 0.4rem; line-height: 1.6; }

  /* Summary bar */
  .total-bar { background: #0073AA; color: #fff; border-radius: 12px; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .total-bar .tb-label { font-size: 0.95rem; opacity: 0.85; }
  .total-bar .tb-value { font-size: 1.8rem; font-weight: 700; }
  .year-note { text-align: center; font-size: 0.82rem; color: #8888a8; margin-bottom: 2rem; }
  .footer { text-align: center; margin-top: 2rem; font-size: 0.75rem; color: #8888a8; }
</style>
</head>
<body>
<div class="container">

  <div class="hero">
    <h1>${project_name} — Monthly Operating Costs</h1>
    <div class="meta">Client: ${client_name} &nbsp;·&nbsp; All prices in ${currency} (${symbol})</div>
  </div>

  <div class="mode-bar">
    <div>
      <div class="mode-label" id="modeLabel">Standard Maintenance</div>
      <div style="font-size:0.78rem;color:#8888a8;margin-top:2px">Toggle for AI-assisted maintenance pricing</div>
    </div>
    <div class="toggle-wrap">
      <span>Standard</span>
      <label class="toggle">
        <input type="checkbox" id="aiToggle">
        <span class="slider"></span>
      </label>
      <span>AI-Assisted</span>
    </div>
  </div>

  <div class="ai-banner" id="aiBanner">
    ⚡ <strong>AI-Assisted Maintenance:</strong> Automated bug triage, monthly Sentinel security scan, AI-generated changelogs, regression test suite. Costs ~40% less — without cutting corners on security.
  </div>

  <div id="servicesContainer"></div>

  <div class="card" style="margin-bottom:1rem;">
    <div class="card-header">
      <h3>WSS Maintenance Retainer</h3>
      <div class="section-total" id="maintenanceLabel">Select a tier below</div>
    </div>
    <div class="tiers-grid" id="tiersGrid"></div>
  </div>

  ${paymongo_note ? `
  <div class="amber-callout">
    <strong>⚡ Payment Processing Fees (PayMongo) — Not Fixed Costs</strong>
    <p>${paymongo_note}</p>
  </div>` : ""}

  <div class="total-bar">
    <div class="tb-label">Estimated Monthly Total</div>
    <div class="tb-value" id="monthlyTotal">—</div>
  </div>
  <div class="year-note" id="yearNote"></div>

  <div class="footer">Prepared by White Space Studio &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
</div>

<script>
const SYMBOL = "${symbol}";
const SERVICES = ${servicesJson};
const TIERS = ${tiersJson};
let isAI = false;
let selectedTier = 1; // default to middle tier

function fmt(n) {
  return SYMBOL + Math.round(n).toLocaleString();
}

// Build service sections
function buildServices() {
  const container = document.getElementById('servicesContainer');
  SERVICES.forEach((section, si) => {
    const card = document.createElement('div');
    card.className = 'card';
    let itemsHTML = '';
    section.items.forEach((item, ii) => {
      itemsHTML += \`
        <div class="service-row">
          <div class="service-info">
            <div class="service-name">\${item.name}</div>
            \${item.description ? \`<div class="service-desc">\${item.description}</div>\` : ''}
            \${item.scales ? \`<div class="scale-warn">⚡ Scales with usage</div>\` : ''}
          </div>
          <input type="number" class="price-input" id="svc_\${si}_\${ii}" value="\${item.price}" min="0" step="100" oninput="updateAll()">
        </div>
      \`;
    });
    card.innerHTML = \`
      <div class="card-header">
        <h3>\${section.title}</h3>
        <div class="section-total" id="sec_total_\${si}"></div>
      </div>
      \${itemsHTML}
    \`;
    container.appendChild(card);
  });
}

// Build maintenance tiers
function buildTiers() {
  const grid = document.getElementById('tiersGrid');
  grid.innerHTML = '';
  TIERS.forEach((tier, ti) => {
    const card = document.createElement('div');
    card.className = 'tier-card' + (ti === selectedTier ? ' selected' : '');
    card.onclick = () => selectTier(ti);
    const price = isAI ? tier.ai_price : tier.price;
    card.innerHTML = \`
      <div class="tier-name">\${tier.name}</div>
      <div class="tier-strike" id="ts_\${ti}">\${fmt(tier.price)}</div>
      <div class="tier-price" id="tp_\${ti}">\${fmt(price)}/mo</div>
      <div class="tier-desc">\${tier.description}</div>
    \`;
    grid.appendChild(card);
  });
}

function selectTier(ti) {
  selectedTier = ti;
  buildTiers();
  updateAll();
}

function getServicesTotal() {
  let total = 0;
  SERVICES.forEach((section, si) => {
    let secTotal = 0;
    section.items.forEach((_, ii) => {
      const val = parseFloat(document.getElementById('svc_' + si + '_' + ii)?.value) || 0;
      secTotal += val;
      total += val;
    });
    const el = document.getElementById('sec_total_' + si);
    if (el) el.textContent = fmt(secTotal) + '/mo';
  });
  return total;
}

function updateAll() {
  const svcTotal = getServicesTotal();
  const tier = TIERS[selectedTier];
  const tierPrice = isAI ? tier.ai_price : tier.price;
  document.getElementById('maintenanceLabel').textContent = fmt(tierPrice) + '/mo — ' + tier.name;

  const monthly = svcTotal + tierPrice;
  document.getElementById('monthlyTotal').textContent = fmt(monthly) + '/mo';
  document.getElementById('yearNote').textContent = 'Year 1 Projection: ' + fmt(monthly * 12);
}

function applyAI(on) {
  isAI = on;
  document.getElementById('modeLabel').textContent = on ? 'AI-Assisted Maintenance' : 'Standard Maintenance';
  document.getElementById('aiBanner').style.display = on ? 'block' : 'none';

  // Show/hide strikethroughs on tiers
  TIERS.forEach((tier, ti) => {
    const strike = document.getElementById('ts_' + ti);
    const price = document.getElementById('tp_' + ti);
    if (strike && price) {
      strike.style.display = on ? 'block' : 'none';
      price.textContent = fmt(on ? tier.ai_price : tier.price) + '/mo';
      price.style.color = on ? '#0f6e56' : '#0073AA';
    }
  });

  updateAll();
}

document.getElementById('aiToggle').addEventListener('change', e => applyAI(e.target.checked));

buildServices();
buildTiers();
updateAll();
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP SERVER SETUP
// ─────────────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "wss-proposal-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_pricing_tool",
      description:
        "Generate a standalone interactive HTML pricing calculator for a client proposal. Includes editable milestone line items, AI-Accelerated toggle, discount field, and grand total. Saves as a .html file.",
      inputSchema: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Client name (e.g. 'TM Transport')" },
          project_name: { type: "string", description: "Project name (e.g. 'Rideshare App')" },
          project_description: { type: "string", description: "One-line description of what's being built" },
          currency: { type: "string", enum: ["PHP", "USD"], description: "Currency — PHP or USD. Default: PHP" },
          output_dir: { type: "string", description: "Absolute folder path to save the .html file. If omitted, saves to current directory." },
          milestones: {
            type: "array",
            description: "Array of project milestones",
            items: {
              type: "object",
              required: ["title", "items"],
              properties: {
                title: { type: "string", description: "Milestone title (e.g. 'Foundation & Architecture')" },
                weeks: { type: "string", description: "Week range label (e.g. 'Weeks 1–4')" },
                items: {
                  type: "array",
                  description: "Line items in this milestone",
                  items: {
                    type: "object",
                    required: ["name", "price"],
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      price: { type: "number", description: "Standard price" },
                      ai_discount: { type: "number", description: "AI discount rate 0–1 (e.g. 0.45 = 45% cheaper with AI). Default: 0.40" },
                      sentinel: { type: "boolean", description: "Mark as SENTINEL (payment/security item requiring human review)" },
                    },
                  },
                },
              },
            },
          },
        },
        required: ["client_name", "project_name", "milestones"],
      },
    },

    {
      name: "generate_monthly_costs",
      description:
        "Generate a standalone interactive HTML monthly operating costs calculator. Includes editable service costs, clickable maintenance retainer tiers, AI-assisted maintenance toggle, and PayMongo fee callout.",
      inputSchema: {
        type: "object",
        properties: {
          client_name: { type: "string" },
          project_name: { type: "string" },
          currency: { type: "string", enum: ["PHP", "USD"], description: "Default: PHP" },
          output_dir: { type: "string", description: "Absolute folder path to save the .html file. Optional." },
          service_sections: {
            type: "array",
            description: "Groups of monthly service costs",
            items: {
              type: "object",
              required: ["title", "items"],
              properties: {
                title: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["name", "price"],
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      price: { type: "number" },
                      scales: { type: "boolean", description: "Flag if cost scales with usage" },
                    },
                  },
                },
              },
            },
          },
          maintenance_tiers: {
            type: "array",
            description: "3 maintenance tiers (Basic, Standard, Premium)",
            items: {
              type: "object",
              required: ["name", "price", "ai_price", "description"],
              properties: {
                name: { type: "string" },
                price: { type: "number", description: "Standard monthly price" },
                ai_price: { type: "number", description: "AI-assisted monthly price (~40% less)" },
                description: { type: "string" },
              },
            },
          },
          paymongo_note: {
            type: "string",
            description: "Optional callout text about payment processing fees (shown in amber). Omit if not relevant.",
          },
        },
        required: ["client_name", "project_name", "service_sections", "maintenance_tiers"],
      },
    },

    {
      name: "save_proposal_file",
      description:
        "Save any HTML string directly to a file on disk. Use this to save a generated pricing tool or monthly costs file to a specific folder on the user's computer.",
      inputSchema: {
        type: "object",
        properties: {
          html_content: { type: "string", description: "The full HTML content to save" },
          filename: { type: "string", description: "File name including .html extension (e.g. 'TM_Rideshare_Pricing.html')" },
          output_dir: { type: "string", description: "Absolute path to the folder where the file should be saved" },
        },
        required: ["html_content", "filename", "output_dir"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "generate_pricing_tool") {
      const html = generatePricingHTML(args);
      const safeName = `${args.client_name.replace(/\s+/g, "_")}_${args.project_name.replace(/\s+/g, "_")}_Pricing.html`;
      const dir = args.output_dir || process.cwd();

      const filePath = path.join(dir, safeName);
      fs.writeFileSync(filePath, html, "utf8");

      return {
        content: [
          {
            type: "text",
            text: `✅ Pricing tool saved to: ${filePath}\n\nFile: ${safeName}\nClient: ${args.client_name}\nProject: ${args.project_name}\nCurrency: ${args.currency || "PHP"}\nMilestones: ${args.milestones.length}\nLine items: ${args.milestones.reduce((a, m) => a + m.items.length, 0)}`,
          },
        ],
      };
    }

    if (name === "generate_monthly_costs") {
      const html = generateMonthlyCostsHTML(args);
      const safeName = `${args.client_name.replace(/\s+/g, "_")}_${args.project_name.replace(/\s+/g, "_")}_Monthly_Costs.html`;
      const dir = args.output_dir || process.cwd();

      const filePath = path.join(dir, safeName);
      fs.writeFileSync(filePath, html, "utf8");

      return {
        content: [
          {
            type: "text",
            text: `✅ Monthly costs tool saved to: ${filePath}\n\nFile: ${safeName}\nClient: ${args.client_name}\nMaintenance tiers: ${args.maintenance_tiers.length}`,
          },
        ],
      };
    }

    if (name === "save_proposal_file") {
      const filePath = path.join(args.output_dir, args.filename);
      fs.writeFileSync(filePath, args.html_content, "utf8");
      return {
        content: [
          {
            type: "text",
            text: `✅ File saved to: ${filePath}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      content: [{ type: "text", text: `❌ Error: ${err.message}` }],
      isError: true,
    };
  }
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
