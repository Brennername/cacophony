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
});
