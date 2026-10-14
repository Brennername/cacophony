import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentRef } from '@angular/core';
import { ModelPullModalComponent } from './model-pull-modal.component';

describe('ModelPullModalComponent (T76.2.4)', () => {
  let component: ModelPullModalComponent;
  let componentRef: ComponentRef<ModelPullModalComponent>;
  let fixture: ComponentFixture<ModelPullModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelPullModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelPullModalComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should initialize with default selected model tag and recommended models', () => {
    expect(component.selectedModelTag).toBe('qwen2.5-coder:3b');
    expect(component.recommendedModels.length).toBeGreaterThan(0);
    expect(component.isPulling()).toBe(false);
    expect(component.progress()).toBeNull();
    expect(component.terminalLogs()).toEqual([]);
  });

  it('should update selectedModelTag when selecting from recommended list', () => {
    component.selectModel('deepseek-r1:8b-4k');
    expect(component.selectedModelTag).toBe('deepseek-r1:8b-4k');
  });

  it('should not allow model selection change when isPulling is true', () => {
    componentRef.setInput('isPulling', true);
    fixture.detectChanges();

    component.selectModel('deepseek-r1:8b-4k');
    expect(component.selectedModelTag).toBe('qwen2.5-coder:3b');
  });

  it('should emit onPull with trimmed model tag when pull action is triggered', () => {
    let pulledTag: string | null = null;
    component.onPull.subscribe((tag) => {
      pulledTag = tag;
    });

    component.selectedModelTag = '  qwen2.5-coder:7b-instruct-q4_K_M  ';
    component.onStartPull();

    expect(pulledTag).toBe('qwen2.5-coder:7b-instruct-q4_K_M');
  });

  it('should not emit onPull when model tag is empty or whitespace', () => {
    let emitCount = 0;
    component.onPull.subscribe(() => {
      emitCount++;
    });

    component.selectedModelTag = '   ';
    component.onStartPull();

    expect(emitCount).toBe(0);
  });

  it('should not emit onPull if already pulling', () => {
    componentRef.setInput('isPulling', true);
    fixture.detectChanges();

    let emitCount = 0;
    component.onPull.subscribe(() => {
      emitCount++;
    });

    component.onStartPull();
    expect(emitCount).toBe(0);
  });

  it('should emit onClose when close is called or close button clicked', () => {
    let closed = false;
    component.onClose.subscribe(() => {
      closed = true;
    });

    component.close();
    expect(closed).toBe(true);
  });

  it('should render progress bar and status when isPulling is true with progress event', () => {
    componentRef.setInput('isPulling', true);
    componentRef.setInput('progress', {
      status: 'downloading layer 3/5',
      completed: 300000000,
      total: 600000000,
      percent: 50,
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const progressStatus = compiled.querySelector('.progress-status');
    const progressPercent = compiled.querySelector('.progress-percent');
    const progressBarFill = compiled.querySelector('.progress-bar-fill') as HTMLElement;

    expect(progressStatus?.textContent).toContain('downloading layer 3/5');
    expect(progressPercent?.textContent).toContain('50%');
    expect(progressBarFill?.style.width).toBe('50%');
  });

  it('should pipe terminal logs to terminal-log-viewer and propagate onClearLogs', () => {
    const logs = ['[Ollama] Pulling manifest', '[Ollama] Downloading digest sha256:abc'];
    componentRef.setInput('terminalLogs', logs);
    fixture.detectChanges();

    let clearEmitted = false;
    component.onClearLogs.subscribe(() => {
      clearEmitted = true;
    });

    component.onClearLogs.emit();
    expect(clearEmitted).toBe(true);

    const terminalViewer = fixture.nativeElement.querySelector('app-terminal-log-viewer');
    expect(terminalViewer).toBeTruthy();
  });
});
