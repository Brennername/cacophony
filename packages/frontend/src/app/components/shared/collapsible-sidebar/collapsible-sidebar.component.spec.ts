import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  CollapsibleSidebarComponent,
  MenuGroup,
} from './collapsible-sidebar.component';

describe('CollapsibleSidebarComponent', () => {
  let fixture: ComponentFixture<CollapsibleSidebarComponent>;
  let component: CollapsibleSidebarComponent;
  let componentRef: ComponentRef<CollapsibleSidebarComponent>;

  const mockMenuGroups: readonly MenuGroup[] = [
    {
      id: 'main',
      title: 'Platform',
      items: [
        { id: 'dash', label: 'Dashboard', icon: 'DB', route: '/dashboard' },
        { id: 'issues', label: 'Issues', icon: 'IS', route: '/issues', badge: 5 },
      ],
    },
    {
      id: 'admin',
      title: 'Admin',
      items: [
        { id: 'hitl', label: 'HITL Gateway', icon: 'HG', route: '/admin/hitl-gateway' },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollapsibleSidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CollapsibleSidebarComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('menuGroups', mockMenuGroups);
    componentRef.setInput('collapsed', false);
    componentRef.setInput('userProfile', {
      username: 'NeXeN',
      role: 'ADMIN',
    });

    fixture.detectChanges();
  });

  it('should create and render navigation groups and items', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.menu-link');
    expect(links.length).toBe(3);
    expect(compiled.textContent).toContain('Platform');
    expect(compiled.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('NeXeN');
  });

  it('should toggle collapse state and emit collapseToggled', () => {
    let emitted = false;
    component.collapseToggled.subscribe((state: boolean) => {
      emitted = state;
    });

    component.toggleCollapse();
    expect(component.collapsed()).toBe(true);
    expect(emitted).toBe(true);
  });

  it('should emit navigated when an item is selected', () => {
    let selectedId = '';
    component.navigated.subscribe((id: string) => {
      selectedId = id;
    });

    component.selectItem(mockMenuGroups[0].items[0]);
    expect(selectedId).toBe('dash');
  });

  it('should handle mobile drawer toggle and close', () => {
    expect(component.mobileDrawerOpen()).toBe(false);
    component.toggleMobileDrawer();
    expect(component.mobileDrawerOpen()).toBe(true);
    component.closeMobileDrawer();
    expect(component.mobileDrawerOpen()).toBe(false);
  });
});
