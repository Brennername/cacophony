import { Injectable, signal, Signal } from '@angular/core';

/**
 * ReactiveSignalService
 *
 * Provides reactive observable and signal bridging for telemetry and success rates.
 */
@Injectable({
  providedIn: 'root'
})
export class ReactiveSignalService {
  private readonly signalValue = signal<number | null>(null);

  public getSignalValue(): number | null {
    return this.signalValue();
  }

  public setSignalValue(value: number): void {
    this.signalValue.set(value);
  }
}
