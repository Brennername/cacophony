import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ExecutionModeSelectorComponent } from './execution-mode-selector.component';

describe('ExecutionModeSelectorComponent', () => {
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
