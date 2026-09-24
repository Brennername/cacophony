import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LspTestLoopPanelComponent } from './lsp-test-loop-panel.component';

describe('LspTestLoopPanelComponent', () => {
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
