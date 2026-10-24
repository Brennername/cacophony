import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { TerminalPanelComponent } from './terminal-panel.component';

describe('TerminalPanelComponent', () => {
  let fixture: ComponentFixture<TerminalPanelComponent>;
  let component: TerminalPanelComponent;
  let componentRef: ComponentRef<TerminalPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminalPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerminalPanelComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('content', 'Initial log line\n\x1b[32mSuccess line\x1b[0m');
    componentRef.setInput('title', 'Arena Worker Output');
    componentRef.setInput('tokensPerSec', 34.2);

    fixture.detectChanges();
  });

  it('should render title and parse ANSI color escapes into HTML spans', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.terminal-title')?.textContent).toContain('Arena Worker Output');
    expect(compiled.querySelector('.throughput-badge')?.textContent).toContain('34.2 tok/s');
    expect(component.parsedHtml()).toContain('<span class="term-green">Success line</span>');
  });

  it('should toggle auto-scroll state', () => {
    expect(component.autoScroll()).toBe(true);
    component.toggleAutoScroll();
    expect(component.autoScroll()).toBe(false);
  });

  it('should emit cleared when clear button is clicked', () => {
    let cleared = false;
    component.cleared.subscribe(() => {
      cleared = true;
    });

    component.clearContent();
    expect(cleared).toBe(true);
  });
});
