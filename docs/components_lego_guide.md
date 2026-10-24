# Cacophony Reusable UI Component Guide ("Lego Instructions")

This guide documents the standardized, mobile-first Angular standalone components in Cacophony. Autonomous models and human contributors should snap these components together like Lego bricks rather than writing ad-hoc layouts or inline styles.

---

## 1. Component Catalog

### 1.1. `app-scrollable-tabs`
- **Selector**: `app-scrollable-tabs`
- **Location**: `src/app/components/shared/scrollable-tabs/scrollable-tabs.component.ts`
- **Description**: Horizontal scrollable tab strip with touch-momentum scrolling, left/right scroll controls, active pill indicator, and closable tab badges.
- **Inputs**:
  - `tabs: readonly TabItem[]` (Required)
  - `activeTabId: string` (Two-way model signal, default `''`)
  - `allowAdd: boolean` (Optional, default `false`)
- **Outputs**:
  - `tabSelected: EventEmitter<string>`
  - `tabClosed: EventEmitter<string>`
  - `tabAdded: EventEmitter<void>`

#### TypeScript Interface
```typescript
export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly badge?: string | number;
  readonly closable?: boolean;
}
```

#### Template Usage
```html
<app-scrollable-tabs
  [tabs]="tabsList"
  [(activeTabId)]="currentTabId"
  [allowAdd]="true"
  (tabSelected)="handleTabSelect($event)"
  (tabClosed)="handleTabClose($event)"
  (tabAdded)="handleTabAdd()"
/>
```

---

### 1.2. `app-collapsible-sidebar`
- **Selector**: `app-collapsible-sidebar`
- **Location**: `src/app/components/shared/collapsible-sidebar/collapsible-sidebar.component.ts`
- **Description**: Anti-clutter responsive navigation sidebar. Defaults to mobile off-canvas drawer mode on small viewports (< 768px). Supports 260px expanded mode and 64px compact icon-only mode on desktop with `Ctrl+B` / `Cmd+B` keyboard shortcut toggling.
- **Inputs**:
  - `menuGroups: readonly MenuGroup[]` (Required)
  - `collapsed: boolean` (Two-way model signal, default `false`)
  - `userProfile: UserProfile | null` (Optional)
- **Outputs**:
  - `navigated: EventEmitter<string>`
  - `collapseToggled: EventEmitter<boolean>`

#### TypeScript Interfaces
```typescript
export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly route?: string;
  readonly badge?: string | number;
  readonly disabled?: boolean;
}

export interface MenuGroup {
  readonly id: string;
  readonly title?: string;
  readonly items: readonly MenuItem[];
}

export interface UserProfile {
  readonly username: string;
  readonly email?: string;
  readonly role?: string;
  readonly avatarUrl?: string;
}
```

#### Template Usage
```html
<app-collapsible-sidebar
  [menuGroups]="navigationGroups"
  [(collapsed)]="isSidebarCollapsed"
  [userProfile]="currentUser"
  (navigated)="onNavigate($event)"
  (collapseToggled)="onSidebarToggle($event)"
/>
```

---

### 1.3. `app-metric-card`
- **Selector**: `app-metric-card`
- **Location**: `src/app/components/shared/metric-card/metric-card.component.ts`
- **Description**: High-density telemetry indicator card with curated HSL color schemes (`nominal`, `warning`, `critical`, `info`), SVG sparkline trend visualization, and uppercase status badges.
- **Inputs**:
  - `title: string` (Required)
  - `value: string | number` (Required)
  - `unit: string` (Optional)
  - `status: 'nominal' | 'warning' | 'critical' | 'info'` (Optional, default `'nominal'`)
  - `trend: readonly number[]` (Optional, array of numbers for sparkline)
  - `subtitle: string` (Optional)

#### Template Usage
```html
<app-metric-card
  title="Inference Rate"
  [value]="38.4"
  unit="tok/s"
  status="nominal"
  [trend]="[28, 30, 32, 35, 38.4]"
  subtitle="Ollama Qwen2.5-Coder"
/>
```

---

### 1.4. `app-terminal-panel`
- **Selector**: `app-terminal-panel`
- **Location**: `src/app/components/shared/terminal-panel/terminal-panel.component.ts`
- **Description**: Virtualized ANSI terminal stream viewer with HTML-escaped color spans, user scroll-detection with auto-scroll pause, token throughput indicator, and one-click clipboard copying.
- **Inputs**:
  - `content: string` (Terminal output string with or without ANSI codes)
  - `maxLines: number` (Optional, default `5000`)
  - `autoScroll: boolean` (Two-way model signal, default `true`)
  - `tokensPerSec: number` (Optional, default `0`)
  - `title: string` (Optional, default `'Terminal Output'`)
- **Outputs**:
  - `cleared: EventEmitter<void>`
  - `copied: EventEmitter<void>`

#### Template Usage
```html
<app-terminal-panel
  [content]="streamingLogs"
  [tokensPerSec]="activeTokensPerSec"
  title="Active Test Run Logs"
  [(autoScroll)]="autoScrollEnabled"
  (cleared)="onLogsCleared()"
/>
```

---

## 2. Layout Code Recipes

### Recipe 1: Tabbed Inspector View (Tabs + Metric Deck + Terminal)
```html
<div class="inspector-layout">
  <app-scrollable-tabs
    [tabs]="inspectorTabs"
    [(activeTabId)]="selectedInspectorTab"
    (tabSelected)="loadTabContent($event)"
  />

  <div class="metrics-grid">
    <app-metric-card
      title="Active Workers"
      [value]="activeWorkerCount"
      status="nominal"
    />
    <app-metric-card
      title="Queue Depth"
      [value]="pendingTasksCount"
      status="info"
    />
    <app-metric-card
      title="Verification Pass Rate"
      [value]="passPercentage + '%'"
      status="nominal"
      [trend]="historicalPassRates"
    />
  </div>

  <app-terminal-panel
    [content]="activeRunLogs"
    title="Worker Execution Log"
    [tokensPerSec]="modelTokensPerSec"
  />
</div>
```

### Recipe 2: Review & Approval Gateway (Card Deck + Diff Viewer + Action Footer)
```html
<div class="gateway-container">
  <div class="gateway-header">
    <h2>HITL Review Gateway</h2>
    <span class="badge">HITL Pending</span>
  </div>

  <div class="ticket-review-card">
    <div class="ticket-meta">
      <span class="author">Author: @contributor</span>
      <span class="security-score">Risk: LOW</span>
    </div>
    <div class="ticket-body">
      <pre>Sanitized prompt and focus files extracted here.</pre>
    </div>
  </div>

  <div class="gateway-action-footer">
    <button type="button" class="btn-reject" (click)="rejectTicket()">Reject</button>
    <button type="button" class="btn-approve" (click)="approveTicket()">Approve and Enqueue</button>
  </div>
</div>
```

### Recipe 3: Contributor Issue Submission Card
```html
<div class="submission-card">
  <h3>Submit New Community Issue</h3>
  <p class="notice">
    <strong>Notice:</strong> We will begin working on your issue after HITL review.
  </p>
  <div class="submission-actions">
    <a
      href="https://github.com/Brennername/cacophony/issues/new?template=bug_report.md"
      target="_blank"
      rel="noopener noreferrer"
      class="btn-github"
    >
      Open Issue on GitHub
    </a>
  </div>
</div>
```

* - No AI were harmed in the drafting of this document.
