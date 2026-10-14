import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentRef } from '@angular/core';
import { TenancyConfigPanelComponent } from './tenancy-config-panel.component';
import type { ModelManagementConfig } from '@cacophony/shared-types';

describe('TenancyConfigPanelComponent (T76.3.4)', () => {
  let component: TenancyConfigPanelComponent;
  let componentRef: ComponentRef<TenancyConfigPanelComponent>;
  let fixture: ComponentFixture<TenancyConfigPanelComponent>;

  const initialConfig: ModelManagementConfig = {
    managedModelsEnabled: true,
    autoEvictionEnabled: false,
    protectedModels: ['qwen2.5-coder:7b', 'deepseek-r1:8b-4k'],
    maxDiskStorageGb: 50,
    minimumSuccessRateThreshold: 0.4,
    maxConsecutiveFailuresBeforeEviction: 3,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenancyConfigPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TenancyConfigPanelComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('config', initialConfig);
    fixture.detectChanges();
  });

  it('should initialize and render status badges according to config', () => {
    expect(component.config()).toEqual(initialConfig);
    const compiled = fixture.nativeElement as HTMLElement;
    const badges = compiled.querySelectorAll('.badge');
    expect(badges.length).toBe(2);
    expect(badges[0]?.textContent?.trim()).toBe('MANAGED');
    expect(badges[1]?.textContent?.trim()).toBe('AUTO-EVICT OFF');
  });

  it('should emit onUpdateConfig when toggling managed models', () => {
    let updatedPayload: Partial<ModelManagementConfig> | null = null;
    component.onUpdateConfig.subscribe((payload) => {
      updatedPayload = payload;
    });

    const mockEvent = {
      target: { checked: false },
    } as unknown as Event;

    component.toggleManagedModels(mockEvent);
    expect(updatedPayload).toEqual({ managedModelsEnabled: false });
  });

  it('should emit onUpdateConfig when toggling auto-eviction', () => {
    let updatedPayload: Partial<ModelManagementConfig> | null = null;
    component.onUpdateConfig.subscribe((payload) => {
      updatedPayload = payload;
    });

    const mockEvent = {
      target: { checked: true },
    } as unknown as Event;

    component.toggleAutoEvict(mockEvent);
    expect(updatedPayload).toEqual({ autoEvictionEnabled: true });
  });

  it('should emit onUpdateConfig with removed item when removeProtectedModel is called', () => {
    let updatedPayload: Partial<ModelManagementConfig> | null = null;
    component.onUpdateConfig.subscribe((payload) => {
      updatedPayload = payload;
    });

    component.removeProtectedModel('deepseek-r1:8b-4k');
    expect(updatedPayload).toEqual({
      protectedModels: ['qwen2.5-coder:7b'],
    });
  });

  it('should emit onUpdateConfig with new item when addProtectedModel is called', () => {
    let updatedPayload: Partial<ModelManagementConfig> | null = null;
    component.onUpdateConfig.subscribe((payload) => {
      updatedPayload = payload;
    });

    component.newProtectedTag = 'gemma3:4b-it-qat-4k';
    component.addProtectedModel();

    expect(updatedPayload).toEqual({
      protectedModels: ['qwen2.5-coder:7b', 'deepseek-r1:8b-4k', 'gemma3:4b-it-qat-4k'],
    });
    expect(component.newProtectedTag).toBe('');
  });

  it('should not add empty or whitespace tags to protected list', () => {
    let emitCount = 0;
    component.onUpdateConfig.subscribe(() => {
      emitCount++;
    });

    component.newProtectedTag = '   ';
    component.addProtectedModel();

    expect(emitCount).toBe(0);
  });

  it('should not add duplicate tags to protected list', () => {
    let emitCount = 0;
    component.onUpdateConfig.subscribe(() => {
      emitCount++;
    });

    component.newProtectedTag = 'qwen2.5-coder:7b';
    component.addProtectedModel();

    expect(emitCount).toBe(0);
  });

  it('should emit onUpdateConfig when quota slider is changed', () => {
    let updatedPayload: Partial<ModelManagementConfig> | null = null;
    component.onUpdateConfig.subscribe((payload) => {
      updatedPayload = payload;
    });

    const mockEvent = {
      target: { value: '80' },
    } as unknown as Event;

    component.onQuotaChange(mockEvent);
    expect(updatedPayload).toEqual({ maxDiskStorageGb: 80 });
  });

  it('should ignore non-numeric or non-positive quota input values', () => {
    let emitCount = 0;
    component.onUpdateConfig.subscribe(() => {
      emitCount++;
    });

    const mockInvalidEvent = {
      target: { value: '-10' },
    } as unknown as Event;

    component.onQuotaChange(mockInvalidEvent);
    expect(emitCount).toBe(0);
  });
});
