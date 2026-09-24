import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DashboardViewComponent } from './dashboard-view.component';

describe('DashboardViewComponent', () => {
  it('should render DashboardViewComponent with dense card sections', () => {
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
});
