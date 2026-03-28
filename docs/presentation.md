---
theme: default
title: FinnLens - Personal Finance Intelligence
info: |
  FinnLens - Automated personal finance tracking via Gmail integration
class: text-center
drawings:
  persist: false
transition: slide-left
mdc: true
---

# FinnLens 2.0

<br>

Your email inbox already knows your finances. FinnLens brings it all together — everything runs on your own machine, no data leaves to a 3rd party.


<style>
h1 {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  background-color: #00ff88;
  background-image: linear-gradient(135deg, #00ff88 0%, #00b4d8 40%, #7b2ff7 100%);
  background-size: 100%;
  -webkit-background-clip: text;
  -moz-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 3.5rem !important;
  letter-spacing: -0.02em;
}
code {
  font-size: 0.75rem;
  color: #94a3b8;
}
</style>

---

# The Problem



- **Financial data is scattered** across dozens of email senders — banks, credit cards, subscriptions, investment platforms

- **Manual tracking is painful** — spreadsheets go stale, apps require repeated data entry

- **No unified view** across credit cards, bank accounts, investments, and subscriptions

- **Critical dates get missed** — bill due dates, SIP debits, subscription renewals

- **3rd-party apps demand everything, give back nothing** — hand over your bank credentials, transaction history, and PAN number only to get targeted ads and spam calls in return



---

# The Insight

<br>

> Every financial transaction you make generates an email.
>
> Credit card alerts, bank statements, subscription receipts, investment confirmations — **your inbox is already a financial database.**

<br>

FinnLens treats Gmail as a **read-only data source** and builds a structured financial profile from what's already there.

**Zero manual entry. Connect once, track everything.**

---

# Features

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'cScale0': '#6366f1', 'cScale1': '#ec4899', 'cScale2': '#14b8a6', 'cScale3': '#f59e0b', 'cScale4': '#8b5cf6', 'cScale5': '#06b6d4', 'cScale6': '#10b981', 'cScaleLabel0': '#fff', 'cScaleLabel1': '#fff', 'cScaleLabel2': '#fff', 'cScaleLabel3': '#000', 'cScaleLabel4': '#fff', 'cScaleLabel5': '#000', 'cScaleLabel6': '#000' }}}%%
mindmap
  root((FinnLens 2.0))
    Gmail Sync
      Email pipeline
      PDF extraction
    Credit Cards
      Auto-discovery
      PDF statement parsing
      Bill & due date tracking
    Bank Accounts
      PDF e-statement import
      UPI handle detection
    Subscriptions
      Auto-detection
      Renewal alerts
    Investments
      Mutual fund SIPs
      Portfolio P&L
    ML Classification
      GLiNER + GLiClass
    Calendar View
      Upcoming bills & SIPs
```

---

# Architecture

<div class="bg-white rounded-lg p-4 inline-block">
<img src="/finnlens-architecture.png" class="mx-auto" />
</div>

---

# Demo

<br>

### Live walkthrough:

mock demo: url

---
