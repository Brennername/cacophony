import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SessionTabsComponent } from './session-tabs.component';

describe('SessionTabsComponent', () => {
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
