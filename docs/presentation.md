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

Your email inbox already knows your finances. FinnLens brings it all together.


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

<br>

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'cScale0': '#ef4444', 'cScale1': '#f97316', 'cScale2': '#eab308', 'cScale3': '#a855f7', 'cScale4': '#ec4899', 'cScaleLabel0': '#fff', 'cScaleLabel1': '#000', 'cScaleLabel2': '#000', 'cScaleLabel3': '#fff', 'cScaleLabel4': '#fff' }}}%%
mindmap
  root((Your Finances))
    Scattered Data
      Dozens of email senders
      Banks, CCs, subscriptions
      Investment platforms
    Manual Tracking
      Spreadsheets go stale
      Apps need repeated entry
      Always playing catch-up
    No Unified View
      CCs + Bank accounts
      Investments + Subs
      Bills + SIP debits
    Missed Deadlines
      Bill due dates
      Subscription renewals
      SIP debits
    Privacy Nightmare
      3rd-party apps demand
      Full Gmail access
      PAN + transaction history
      In return: ads & spam calls
```

---

# The Solution

<br>

Your email inbox already knows your finances. FinnLens brings it all together — everything runs on your own machine, no data leaves to a 3rd party.



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

### Mock Demo
### Live Demo


---
