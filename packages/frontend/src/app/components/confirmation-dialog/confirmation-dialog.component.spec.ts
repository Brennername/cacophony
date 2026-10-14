import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent (T65.5.2)', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize closed with default configuration', () => {
    expect(component.isOpen()).toBe(false);
    expect(component.activeService()).toBe('');
    expect(component.isDangerous()).toBe(true);
  });

  it('should open and store specified service name', () => {
    component.open('Ollama');
    expect(component.isOpen()).toBe(true);
    expect(component.activeService()).toBe('Ollama');
  });

  it('should emit confirmed with service name and close dialog', () => {
    let emittedService: string | undefined;
    component.confirmed.subscribe((svc) => {
      emittedService = svc;
    });

    component.open('PGlite');
    component.confirm();

    expect(emittedService).toBe('PGlite');
    expect(component.isOpen()).toBe(false);
  });

  it('should emit cancelled and close dialog', () => {
    let cancelEmitted = false;
    component.cancelled.subscribe(() => {
      cancelEmitted = true;
    });

    component.open('Gitea');
    component.cancel();

    expect(cancelEmitted).toBe(true);
    expect(component.isOpen()).toBe(false);
  });

  it('should close when escape key handler is triggered', () => {
    let cancelEmitted = false;
    component.cancelled.subscribe(() => {
      cancelEmitted = true;
    });

    component.open('Ollama');
    expect(component.isOpen()).toBe(true);

    component.onEscapeKey();
    expect(cancelEmitted).toBe(true);
    expect(component.isOpen()).toBe(false);
  });

  it('should render dialog card when open', () => {
    component.open('PGlite');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const dialogCard = element.querySelector('.dialog-card');
    expect(dialogCard).not.toBeNull();

    const serviceTag = element.querySelector('.service-tag');
    expect(serviceTag?.textContent?.trim()).toBe('PGlite');
  });
});
