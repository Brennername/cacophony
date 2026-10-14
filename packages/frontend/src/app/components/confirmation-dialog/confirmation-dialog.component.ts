import { Component, ChangeDetectionStrategy, signal, input, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ConfirmationDialogComponent
 *
 * Prompts the operator before executing sensitive or destructive operations,
 * such as restarting critical infrastructure services (Ollama, PGlite, Gitea).
 * Conforms to mobile-first standards, dark/light themes, and WCAG accessibility guidelines.
 */
@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
  public readonly title = input<string>('Confirm Critical Service Action');
  public readonly message = input<string>(
    'Restarting infrastructure services may disrupt active model inference pipelines and background workers. Are you sure you want to proceed?'
  );
  public readonly serviceName = input<string>('');
  public readonly confirmText = input<string>('Restart Service');
  public readonly cancelText = input<string>('Cancel');
  public readonly isDangerous = input<boolean>(true);

  public readonly isOpen = signal<boolean>(false);
  public readonly activeService = signal<string>('');

  public readonly confirmed = output<string>();
  public readonly cancelled = output<void>();

  @HostListener('document:keydown.escape')
  public onEscapeKey(): void {
    if (this.isOpen()) {
      this.cancel();
    }
  }

  public open(service?: string): void {
    this.activeService.set(service ?? this.serviceName());
    this.isOpen.set(true);
  }

  public close(): void {
    this.isOpen.set(false);
  }

  public confirm(): void {
    const target = this.activeService() || this.serviceName();
    this.confirmed.emit(target);
    this.close();
  }

  public cancel(): void {
    this.cancelled.emit();
    this.close();
  }
}
