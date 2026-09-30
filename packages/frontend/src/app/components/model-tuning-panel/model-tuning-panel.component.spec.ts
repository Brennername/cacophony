import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModelTuningPanelComponent } from './model-tuning-panel.component';
import type { ModelTuningProfile } from '@cacophony/shared-types';

describe('ModelTuningPanelComponent', () => {
  let component: ModelTuningPanelComponent;
  let fixture: ComponentFixture<ModelTuningPanelComponent>;

  const mockProfiles: ModelTuningProfile[] = [
    {
      id: 'profile-deepseek-r1_8b-architect',
      modelName: 'deepseek-r1:8b',
      role: 'architect',
      numPredict: 8192,
      numCtx: 16384,
      temperature: 0.6,
      topK: 40,
      topP: 0.95,
      repeatPenalty: 1.1,
      autoTuned: true,
      isActive: true,
      createdAt: '2026-09-30T10:00:00Z',
      updatedAt: '2026-09-30T10:00:00Z'
    },
    {
      id: 'profile-qwen2_5-coder_7b-implementer',
      modelName: 'qwen2.5-coder:7b',
      role: 'implementer',
      numPredict: 4096,
      numCtx: 16384,
      temperature: 0.05,
      topK: 40,
      topP: 0.9,
      repeatPenalty: 1.1,
      autoTuned: false,
      isActive: true,
      createdAt: '2026-09-30T10:00:00Z',
      updatedAt: '2026-09-30T10:00:00Z'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelTuningPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModelTuningPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profiles', mockProfiles);
    fixture.detectChanges();
  });

  it('renders model tuning cards for each provided profile', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.profile-item');
    expect(items.length).toBe(2);
    expect(compiled.textContent).toContain('deepseek-r1:8b');
    expect(compiled.textContent).toContain('qwen2.5-coder:7b');
  });

  it('renders auto-tuned badge when autoTuned is true', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const autoBadges = compiled.querySelectorAll('.auto-badge');
    expect(autoBadges.length).toBe(1);
    expect(autoBadges[0]?.textContent).toContain('AUTO-TUNED');
  });

  it('emits onSaveProfile with updated parameters when save button is clicked', () => {
    let emittedProfile: ModelTuningProfile | null = null;
    component.onSaveProfile.subscribe((p) => {
      emittedProfile = p;
    });

    const targetProfile = mockProfiles[0]!;
    // Simulate updating numPredict
    component.updateField(targetProfile, 'numPredict', {
      target: { value: '12000' }
    } as unknown as Event);

    component.saveProfile(targetProfile);
    expect(emittedProfile).not.toBeNull();
    expect((emittedProfile as unknown as ModelTuningProfile).numPredict).toBe(12000);
    expect(component.feedbackMessage()).toContain('Updated tuning profile');
  });

  it('emits onAutoTune when Auto-Tune button is clicked', () => {
    let autoTuneTriggered = false;
    component.onAutoTune.subscribe(() => {
      autoTuneTriggered = true;
    });

    component.triggerAutoTune();
    expect(autoTuneTriggered).toBe(true);
    expect(component.isAutoTuning()).toBe(true);
  });
});
