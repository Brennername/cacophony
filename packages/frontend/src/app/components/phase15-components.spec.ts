import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SessionTabsComponent } from './session-tabs/session-tabs.component';
import { ConversationTimelineComponent } from './conversation-timeline/conversation-timeline.component';
import { RepoMapViewerComponent } from './repo-map-viewer/repo-map-viewer.component';
import { ExecutionModeSelectorComponent } from './execution-mode-selector/execution-mode-selector.component';
import { CheckpointTimelineComponent } from './checkpoint-timeline/checkpoint-timeline.component';
import { LspTestLoopPanelComponent } from './lsp-test-loop-panel/lsp-test-loop-panel.component';

describe('Phase 15: Modern Angular Standalone Components (Signals & Zoneless)', () => {
  describe('SessionTabsComponent (T15.1.1)', () => {
    it('should create new session tabs and select them with Signals', () => {
      TestBed.configureTestingModule({
        imports: [SessionTabsComponent],
      });
      const fixture = TestBed.createComponent(SessionTabsComponent);
      fixture.detectChanges();
      const comp = fixture.componentInstance;

      expect(comp.tabs().length).toBe(1);
      comp.createNewTab();
      expect(comp.tabs().length).toBe(2);
      expect(comp.activeTabId()).toBe(comp.tabs()[1]!.id);
    });
  });

  describe('ConversationTimelineComponent (T15.1.2)', () => {
    it('should render messages and compute token counts reactively', () => {
      TestBed.configureTestingModule({
        imports: [ConversationTimelineComponent],
      });
      const fixture = TestBed.createComponent(ConversationTimelineComponent);
      fixture.componentRef.setInput('messages', [
        { id: '1', role: 'user', content: 'Generate schema', tokens: 15 },
        { id: '2', role: 'assistant', content: 'CREATE TABLE ...', tokens: 45 }
      ]);
      fixture.detectChanges();

      const comp = fixture.componentInstance;
      expect(comp.totalTokens()).toBe(60);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Total Tokens: 60');
      expect(compiled.textContent).toContain('CREATE TABLE');
    });
  });

  describe('RepoMapViewerComponent (T15.2.1)', () => {
    it('should filter nodes and select active architectural symbol', () => {
      TestBed.configureTestingModule({
        imports: [RepoMapViewerComponent],
      });
      const fixture = TestBed.createComponent(RepoMapViewerComponent);
      fixture.detectChanges();
      const comp = fixture.componentInstance;

      expect(comp.filteredNodes().length).toBe(5);
      comp.searchQuery.set('Scheduler');
      expect(comp.filteredNodes().length).toBe(1);
      expect(comp.filteredNodes()[0]!.name).toBe('TaskScheduler');

      comp.selectNode(comp.filteredNodes()[0]!);
      expect(comp.selectedNodeId()).toBe('sym-1');
      expect(comp.selectedNode()?.name).toBe('TaskScheduler');
    });
  });

  describe('ExecutionModeSelectorComponent (T15.5.1)', () => {
    it('should update execution mode signal on selection', () => {
      TestBed.configureTestingModule({
        imports: [ExecutionModeSelectorComponent],
      });
      const fixture = TestBed.createComponent(ExecutionModeSelectorComponent);
      fixture.detectChanges();
      const comp = fixture.componentInstance;

      expect(comp.selectedMode()).toBe('build');
      comp.selectMode('plan');
      expect(comp.selectedMode()).toBe('plan');
      comp.selectMode('auto');
      expect(comp.selectedMode()).toBe('auto');
    });
  });

  describe('CheckpointTimelineComponent & LspTestLoopPanelComponent (T15.4 & T15.5)', () => {
    it('should render checkpoint entries and trigger undo', () => {
      TestBed.configureTestingModule({
        imports: [CheckpointTimelineComponent],
      });
      const fixture = TestBed.createComponent(CheckpointTimelineComponent);
      fixture.detectChanges();
      const comp = fixture.componentInstance;

      let undoEmitted = false;
      comp.undo.subscribe(() => { undoEmitted = true; });
      comp.triggerUndo();
      expect(undoEmitted).toBe(true);
    });

    it('should render compiler diagnostics and test loop status', () => {
      TestBed.configureTestingModule({
        imports: [LspTestLoopPanelComponent],
      });
      const fixture = TestBed.createComponent(LspTestLoopPanelComponent);
      fixture.componentRef.setInput('diagnostics', [
        {
          id: 'd-1',
          filePath: 'packages/engine/src/index.ts',
          line: 12,
          character: 5,
          severity: 'error',
          code: 2304,
          message: 'Cannot find name Foo'
        }
      ]);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Cannot find name Foo');
      expect(compiled.textContent).toContain('TS2304');
    });
  });

  describe('Phase 20: Mobile-First Route Views & High-Density Navigation (T20.1 & T20.2)', () => {
    it('should configure and resolve modular route definitions', async () => {
      const { routes } = await import('../app.routes');
      expect(routes.length).toBeGreaterThanOrEqual(9);

      const paths = routes.map((r) => r.path);
      expect(paths).toContain('');
      expect(paths).toContain('dashboard');
      expect(paths).toContain('queue');
      expect(paths).toContain('history');
      expect(paths).toContain('models');
      expect(paths).toContain('repomap');
      expect(paths).toContain('processes');
      expect(paths).toContain('settings');
      expect(paths).toContain('auth/callback');
    });

    it('should render DashboardViewComponent with dense card sections', async () => {
      const { DashboardViewComponent } = await import('./views/dashboard-view.component');
      const { ActivatedRoute } = await import('@angular/router');
      TestBed.configureTestingModule({
        imports: [DashboardViewComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { paramMap: { get: () => null } },
            },
          },
        ],
      });
      const fixture = TestBed.createComponent(DashboardViewComponent);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.dashboard-grid')).toBeTruthy();
      expect(compiled.querySelector('app-hardware-monitor')).toBeTruthy();
      expect(compiled.querySelector('app-task-inspector')).toBeTruthy();
      expect(compiled.querySelector('app-queue-manager')).toBeTruthy();
    });

    it('should render SettingsViewComponent and toggle themes', async () => {
      const { SettingsViewComponent } = await import('./views/settings-view.component');
      TestBed.configureTestingModule({
        imports: [SettingsViewComponent],
      });
      const fixture = TestBed.createComponent(SettingsViewComponent);
      fixture.detectChanges();

      const comp = fixture.componentInstance;
      expect(comp.themeService.currentTheme()).toBe('dark');
      comp.themeService.setTheme('high-contrast');
      expect(comp.themeService.currentTheme()).toBe('high-contrast');
      comp.themeService.setTheme('dark');
    });
  });

  describe('Phase 21: Real-Time Task Progress & Gantt Transport (T21.1 & T21.2)', () => {
    it('should render StageProgressBarComponent and calculate step progress', async () => {
      const { StageProgressBarComponent } = await import('./stage-progress-bar/stage-progress-bar.component');
      TestBed.configureTestingModule({
        imports: [StageProgressBarComponent],
      });
      const fixture = TestBed.createComponent(StageProgressBarComponent);
      fixture.componentRef.setInput('progressPercent', 57);
      fixture.componentRef.setInput('tokensPerSec', 42.5);
      fixture.componentRef.setInput('currentStageNumber', 4);
      fixture.componentRef.setInput('activeStageLabel', '4/7 Scrubbing');
      fixture.detectChanges();

      const comp = fixture.componentInstance;
      expect(comp.progressPercent()).toBe(57);
      expect(comp.tokensPerSec()).toBe(42.5);
      expect(comp.formattedTokensPerSec()).toBe('42.5');
      expect(comp.currentStageNumber()).toBe(4);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('4/7 Scrubbing');
      expect(compiled.textContent).toContain('42.5');
      expect(compiled.textContent).toContain('57%');

      // Test fixed-width element class presence
      const fixedEl = compiled.querySelector('.fixed-tks');
      expect(fixedEl).not.toBeNull();
      expect(fixedEl?.textContent?.trim()).toBe('42.5');

      // Test live matching with runTokensPerSec
      fixture.componentRef.setInput('runTokensPerSec', 42.0);
      fixture.detectChanges();
      expect(comp.isLiveMatched()).toBe(true);
      expect(compiled.textContent).toContain('LIVE');

      // Test click to expand stage details
      expect(comp.expandedStage()).toBeNull();
      comp.selectStage(comp.stages()[0]!);
      expect(comp.expandedStage()?.name).toBe('planning');
    });

    it('should render GanttTransportComponent with zoom controls and playhead', async () => {
      const { GanttTransportComponent } = await import('./gantt-transport/gantt-transport.component');
      TestBed.configureTestingModule({
        imports: [GanttTransportComponent],
      });
      const fixture = TestBed.createComponent(GanttTransportComponent);
      fixture.detectChanges();

      const comp = fixture.componentInstance;
      expect(comp.zoomLevel()).toBe(1.0);
      comp.zoomIn();
      expect(comp.zoomLevel()).toBe(1.5);
      comp.zoomOut();
      expect(comp.zoomLevel()).toBe(1.0);

      comp.resetPlayhead();
      expect(comp.playheadPos()).toBe(0);

      expect(comp.inferenceSpans().length).toBeGreaterThanOrEqual(1);
      expect(comp.testSpans().length).toBeGreaterThanOrEqual(1);
      expect(comp.gitSpans().length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Phase 22: Historical Failure Taxonomy & AOC Trend Visualizations (T22.1 & T22.2)', () => {
    it('should render TrendChartComponent and toggle metric series', async () => {
      const { TrendChartComponent } = await import('./trend-chart/trend-chart.component');
      TestBed.configureTestingModule({
        imports: [TrendChartComponent],
      });
      const fixture = TestBed.createComponent(TrendChartComponent);
      fixture.detectChanges();

      const comp = fixture.componentInstance;
      expect(comp.selectedMetric()).toBe('passRate');
      expect(comp.points().length).toBe(7);
      expect(comp.linePath()).toContain('M 0');
      expect(comp.areaPath()).toContain('Z');

      comp.selectMetric('throughput');
      expect(comp.selectedMetric()).toBe('throughput');
      expect(comp.currentSeries()[0]!.value).toBe(36);

      comp.selectMetric('failures');
      expect(comp.selectedMetric()).toBe('failures');
      expect(comp.currentSeries()[0]!.value).toBe(8);

      // Test hover tooltip
      comp.hoverPoint({ x: 50, y: 80, label: 'Day 2', value: 12 }, 1);
      expect(comp.hoveredPoint()?.value).toBe(12);
    });
  });

  describe('Phase 40: Mobile-First UI Density, Multi-Theme Palettes & Interactive Drill-Downs (T40.1 & T40.2)', () => {
    it('T40.1: should render TaskDetailModalComponent with tab navigation and copy actions', async () => {
      const { TaskDetailModalComponent } = await import('./task-detail-modal/task-detail-modal.component');
      const { ArenaStateStore } = await import('../services/arena-state.store');

      TestBed.configureTestingModule({
        imports: [TaskDetailModalComponent],
      });

      const store = TestBed.inject(ArenaStateStore);
      store.selectedTask.set({
        id: 'task-modal-test',
        title: 'Drilldown Test Task',
        status: 'RUNNING',
        priority: 'P0',
        role: 'implementer',
        prompt: 'Build resilient subsystem',
        testCommand: 'npm run test:fast',
        stages: [
          {
            id: '1',
            stageName: 'generation',
            stageStatus: 'SUCCESS',
            logOutput: 'Generating code...',
            durationMs: 1200,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          },
          {
            id: '2',
            stageName: 'test_execution',
            stageStatus: 'FAILURE',
            logOutput: 'FAIL src/app.spec.ts\nAssertionError: expected true to be false',
            durationMs: 450,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          }
        ]
      });

      const fixture = TestBed.createComponent(TaskDetailModalComponent);
      fixture.detectChanges();

      const comp = fixture.componentInstance;
      expect(comp.activeTab()).toBe('overview');

      comp.activeTab.set('stages');
      expect(comp.activeTab()).toBe('stages');

      comp.activeTab.set('diffs');
      expect(comp.activeTab()).toBe('diffs');

      comp.activeTab.set('stderr');
      expect(comp.activeTab()).toBe('stderr');
      expect(comp.extractTestStderr(store.selectedTask())).toContain('AssertionError');

      comp.copyText('npm run test:fast', 'Copied!');
      expect(comp.copiedMessage()).toBe('Copied!');

      comp.handleEscape();
      expect(store.selectedTask()).toBeNull();
    });

    it('T40.2: should support curated theme cycling in ThemeService', async () => {
      const { ThemeService } = await import('../services/theme.service');
      TestBed.configureTestingModule({
        providers: [ThemeService],
      });
      const themeService = TestBed.inject(ThemeService);

      expect(themeService.availableThemes.length).toBeGreaterThanOrEqual(6);
      expect(themeService.availableThemes.some((t) => t.id === 'oled')).toBe(true);
      expect(themeService.availableThemes.some((t) => t.id === 'nord')).toBe(true);
      expect(themeService.availableThemes.some((t) => t.id === 'cyberpunk')).toBe(true);

      themeService.setTheme('nord');
      expect(themeService.currentTheme()).toBe('nord');

      themeService.setTheme('cyberpunk');
      expect(themeService.currentTheme()).toBe('cyberpunk');
    });
  });
});



