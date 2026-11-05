import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ThumbPadComponent, DEFAULT_THUMB_PAD_ITEMS, ThumbPadItem } from './thumb-pad.component';

describe('ThumbPadComponent', () => {
  let component: ThumbPadComponent;
  let fixture: ComponentFixture<ThumbPadComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThumbPadComponent],
      providers: [
        provideRouter([
          { path: 'dashboard', children: [] },
          { path: 'queue', children: [] },
          { path: 'history', children: [] },
          { path: 'models', children: [] },
          { path: 'vault', children: [] },
          { path: 'testing', children: [] },
          { path: 'settings', children: [] },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThumbPadComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should initialize and actively highlight dashboard when on root or dashboard route', () => {
    expect(component.items().length).toBe(6);
    const dashItem = component.items().find((i) => i.id === 'dash')!;
    expect(component.isExpanded(dashItem)).toBe(true);
    expect(component.isSelected(dashItem)).toBe(true);

    const expandedLabel = fixture.nativeElement.querySelector('.item-label');
    expect(expandedLabel.textContent.trim()).toBe('Dash');

    const letters = fixture.nativeElement.querySelectorAll('.item-letter');
    expect(letters.length).toBe(5);
  });

  it('should return to default with no letter selected when navigating to non-thumb route', async () => {
    await router.navigateByUrl('/settings');
    fixture.detectChanges();

    expect(component.activeExpandedId()).toBeNull();
    component.items().forEach((item) => {
      expect(component.isExpanded(item)).toBe(false);
      expect(component.isSelected(item)).toBe(false);
    });

    const renderedLetters = fixture.nativeElement.querySelectorAll('.item-letter');
    expect(renderedLetters.length).toBe(6);
    expect(fixture.nativeElement.querySelector('.item-label')).toBeNull();
  });

  it('should actively highlight and expand route when navigating to a thumb bar route', async () => {
    await router.navigateByUrl('/queue');
    fixture.detectChanges();

    const queueItem = component.items().find((i) => i.id === 'queue')!;
    expect(component.isExpanded(queueItem)).toBe(true);
    expect(component.isSelected(queueItem)).toBe(true);

    const dashItem = component.items().find((i) => i.id === 'dash')!;
    expect(component.isExpanded(dashItem)).toBe(false);

    const expandedLabel = fixture.nativeElement.querySelector('.item-label');
    expect(expandedLabel.textContent.trim()).toBe('Queue');

    await router.navigateByUrl('/history');
    fixture.detectChanges();

    const historyItem = component.items().find((i) => i.id === 'history')!;
    expect(component.isExpanded(historyItem)).toBe(true);
    expect(component.isSelected(historyItem)).toBe(true);
    expect(fixture.nativeElement.querySelector('.item-label').textContent.trim()).toBe('Hist');
  });

  it('should scroll to top of page when thumbing an item', async () => {
    const scrollSpy = vi.spyOn(component, 'scrollToTop');
    const queueItem = component.items().find((i) => i.id === 'queue')!;
    const clickEvent = new MouseEvent('click');

    component.onThumb(queueItem, clickEvent);
    fixture.detectChanges();

    expect(scrollSpy).toHaveBeenCalled();
    expect(component.isExpanded(queueItem)).toBe(true);
  });

  it('should support generalized custom route items configuration at will', () => {
    const customItems: ThumbPadItem[] = [
      { id: 'custom-1', letter: 'A', label: 'Alpha', route: '/alpha', ariaLabel: 'Alpha View' },
      { id: 'custom-2', letter: 'B', label: 'Beta', route: '/beta', ariaLabel: 'Beta View' },
    ];

    fixture.componentRef.setInput('items', customItems);
    component.syncActiveItemWithUrl('/settings');
    fixture.detectChanges();

    const letters = fixture.nativeElement.querySelectorAll('.item-letter');
    expect(letters.length).toBe(2);
    expect(letters[0].textContent.trim()).toBe('A');
    expect(letters[1].textContent.trim()).toBe('B');
  });

  it('should project the offset blur pane to obscure background scrolling', () => {
    const blurOffset = fixture.nativeElement.querySelector('.thumb-pad-blur-offset');
    expect(blurOffset).toBeTruthy();
  });
});
