import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-process-drawer',
  template: '<div class="component-container">{{ processCount }} System Processes Active - {{ totalMemoryUsage.toFixed(2) }} GB RSS</div>',
  styles: []
})
export class ProcessDrawerComponent implements OnInit {
  processes: { id: number; name: string; memoryUsage: number }[] = [];
  totalMemoryUsage: number = 0;
  processCount: number = 0;

  constructor() { }

  ngOnInit(): void {
    this.fetchProcessData();
  }

  fetchProcessData(): void {
    // Simulate fetching process data
    this.processes = [
      { id: 1, name: 'System Process', memoryUsage: 256 },
      { id: 2, name: 'User Process', memoryUsage: 512 },
      // Add more processes as needed
    ];

    this.calculateTotalMemoryUsage();
    this.updateProcessCount();
  }

  calculateTotalMemoryUsage(): void {
    this.totalMemoryUsage = this.processes.reduce((total, process) => total + process.memoryUsage, 0);
  }

  updateProcessCount(): void {
    this.processCount = this.processes.length;
  }
}
