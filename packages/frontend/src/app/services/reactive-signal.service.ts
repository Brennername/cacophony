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
  private readonly signalValue: Signal<number | null> = signal(null);

  public getSignalValue(): number | null {
    return this.signalValue();
  }

  public setSignalValue(value: number): void {
    (this.signalValue as any).set(value);
  }
}
