import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessesViewComponent } from './processes-view.component';

/**
 * TestingViewComponent
 *
 * Dedicated route view for running tests, subprocess inspections, and deterministic verification.
 */
@Component({
  selector: 'app-testing-view',
  standalone: true,
  imports: [CommonModule, ProcessesViewComponent],
  template: `<app-processes-view />`
})
export class TestingViewComponent {}
