import { describe, it, expect, beforeEach } from 'vitest';
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
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThumbPadComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should initialize with all items collapsed to single letters on initial visit/refresh', () => {
    expect(component.hasInteracted()).toBe(false);
    expect(component.items().length).toBe(6);

    const letters = component.items().map((i) => i.letter);
    expect(letters).toEqual(['D', 'Q', 'H', 'M', 'V', 'T']);

    // None should be expanded before interaction
    component.items().forEach((item) => {
      expect(component.isExpanded(item)).toBe(false);
    });

    const renderedLetters = fixture.nativeElement.querySelectorAll('.item-letter');
    expect(renderedLetters.length).toBe(6);
  });

  it('should expand item label only after user thumbs a route', async () => {
    const queueItem = component.items().find((i) => i.id === 'queue')!;
    const clickEvent = new MouseEvent('click');

    component.onThumb(queueItem, clickEvent);
    fixture.detectChanges();

    expect(component.hasInteracted()).toBe(true);
    expect(component.isExpanded(queueItem)).toBe(true);

    // Other items must remain collapsed as single letters
    const dashItem = component.items().find((i) => i.id === 'dash')!;
    expect(component.isExpanded(dashItem)).toBe(false);

    fixture.detectChanges();
    const expandedLabel = fixture.nativeElement.querySelector('.item-label');
    expect(expandedLabel.textContent.trim()).toBe('Queue');
  });

  it('should support generalized custom route items configuration at will', () => {
    const customItems: ThumbPadItem[] = [
      { id: 'custom-1', letter: 'A', label: 'Alpha', route: '/alpha', ariaLabel: 'Alpha View' },
      { id: 'custom-2', letter: 'B', label: 'Beta', route: '/beta', ariaLabel: 'Beta View' },
    ];

    fixture.componentRef.setInput('items', customItems);
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
