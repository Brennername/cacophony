import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { ScrollableTabsComponent, TabItem } from './scrollable-tabs.component';

describe('ScrollableTabsComponent', () => {
  let fixture: ComponentFixture<ScrollableTabsComponent>;
  let component: ScrollableTabsComponent;
  let componentRef: ComponentRef<ScrollableTabsComponent>;

  const mockTabs: readonly TabItem[] = [
    { id: 'tab1', label: 'Overview', badge: 3 },
    { id: 'tab2', label: 'Issues', closable: true },
    { id: 'tab3', label: 'Logs' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrollableTabsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScrollableTabsComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('tabs', mockTabs);
    componentRef.setInput('activeTabId', 'tab1');
    componentRef.setInput('allowAdd', true);

    fixture.detectChanges();
  });

  it('should create and render tabs with correct labels', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    const tabButtons = compiled.querySelectorAll('.tab-item');
    expect(tabButtons.length).toBe(3);
    expect(tabButtons[0].textContent).toContain('Overview');
    expect(tabButtons[0].textContent).toContain('3');
  });

  it('should emit tabSelected when a tab is clicked', () => {
    let selectedId = '';
    component.tabSelected.subscribe((id: string) => {
      selectedId = id;
    });

    component.selectTab('tab2');
    expect(selectedId).toBe('tab2');
    expect(component.activeTabId()).toBe('tab2');
  });

  it('should emit tabClosed when close button is clicked', () => {
    let closedId = '';
    component.tabClosed.subscribe((id: string) => {
      closedId = id;
    });

    const event = new MouseEvent('click');
    component.closeTab(event, 'tab2');
    expect(closedId).toBe('tab2');
  });

  it('should emit tabAdded when add button is clicked', () => {
    let added = false;
    component.tabAdded.subscribe(() => {
      added = true;
    });

    component.addTab();
    expect(added).toBe(true);
  });
});
