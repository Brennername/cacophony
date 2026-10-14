import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CheckpointRecord {
  readonly id: string;
  readonly hash: string;
  readonly message: string;
  readonly createdAt: string;
  readonly filesChanged: number;
}

@Component({
  selector: 'app-checkpoint-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkpoint-timeline.component.html',
  styleUrl: './checkpoint-timeline.component.css',
})
export class CheckpointTimelineComponent {
  public readonly checkpoints = input<CheckpointRecord[]>([
    { id: 'cp-1', hash: 'a1b2c3d4e5f6', message: 'Pre-edit: SessionTabs implementation', createdAt: '10:15:20', filesChanged: 2 },
    { id: 'cp-2', hash: 'b2c3d4e5f6a1', message: 'Pre-edit: RepoMapViewer node calculation', createdAt: '10:22:15', filesChanged: 1 }
  ]);
  public readonly activeCheckpointId = signal<string | null>(null);
  public diffDrawerOpen: boolean = false;
  public diffText: string = '';

  public readonly undo = output<void>();
  public readonly redo = output<void>();
  public readonly checkpointSelected = output<string>();

  public readonly canUndo = computed<boolean>(() => {
    const cps = this.checkpoints();
    const active = this.activeCheckpointId();
    if (!active || cps.length <= 1) return false;
    const idx = cps.findIndex((c) => c.id === active);
    return idx > 0;
  });

  public readonly canRedo = computed<boolean>(() => {
    const cps = this.checkpoints();
    const active = this.activeCheckpointId();
    if (!active || cps.length <= 1) return false;
    const idx = cps.findIndex((c) => c.id === active);
    return idx >= 0 && idx < cps.length - 1;
  });

  public triggerUndo(): void {
    if (this.canUndo()) {
      const cps = this.checkpoints();
      const idx = cps.findIndex((c) => c.id === this.activeCheckpointId());
      if (idx > 0) {
        this.selectCheckpoint(cps[idx - 1]!.id);
      }
      this.undo.emit();
    }
  }

  public triggerRedo(): void {
    if (this.canRedo()) {
      const cps = this.checkpoints();
      const idx = cps.findIndex((c) => c.id === this.activeCheckpointId());
      if (idx >= 0 && idx < cps.length - 1) {
        this.selectCheckpoint(cps[idx + 1]!.id);
      }
      this.redo.emit();
    }
  }

  public selectCheckpoint(id: string): void {
    this.activeCheckpointId.set(id);
    this.diffDrawerOpen = true;
    const cps = this.checkpoints();
    const selected = cps.find((c) => c.id === id);
    const initial = cps[0];
    if (selected && initial && selected !== initial) {
      this.diffText = `${selected.message}\n- ${initial.message}`;
    } else if (selected) {
      this.diffText = selected.message;
    }
    this.checkpointSelected.emit(id);
  }
}