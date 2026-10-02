import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SSEService } from '@cacophony/shared-types';

@Component({
  selector: 'app-testing-view',
  templateUrl: './testing-view.component.html',
  styleUrls: ['./testing-view.component.css']
})
export class TestingViewComponent implements OnInit, OnDestroy {
  testOutput: string[] = [];
  private sseSubscription: Subscription;

  constructor(private sseService: SSEService) {}

  ngOnInit(): void {
    this.sseSubscription = this.sseService.connect('test_output').subscribe((event) => {
      if (event.data) {
        this.testOutput.push(event.data);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
    }
  }
}