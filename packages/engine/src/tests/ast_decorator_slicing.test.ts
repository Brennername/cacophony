import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AstContextSlicer } from '../context/AstContextSlicer.js';

describe('AstContextSlicer Decorator Preservation (T96.3.2)', () => {
  const slicer = new AstContextSlicer();

  test('correctly preserves @Component decorator when generating class skeleton', () => {
    const code = `
@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'cacophony';
  constructor() {}
  public ngOnInit(): void {
    console.log('init');
  }
}
`;

    const result = slicer.generateTypeSkeleton(code, ['AppComponent']);
    assert.ok(result.skeletonContent.includes('@Component'));
    assert.ok(result.skeletonContent.includes("selector: 'app-root'"));
    assert.ok(result.skeletonContent.includes('export class AppComponent'));
    assert.ok(result.skeletonContent.includes('ngOnInit(): void;'));
  });

  test('correctly preserves @Injectable decorator with providedIn options', () => {
    const code = `
@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private active = true;
  constructor() {}
  public sample(): number {
    return 42;
  }
}
`;

    const result = slicer.generateTypeSkeleton(code, ['TelemetryService']);
    assert.ok(result.skeletonContent.includes('@Injectable'));
    assert.ok(result.skeletonContent.includes("providedIn: 'root'"));
    assert.ok(result.skeletonContent.includes('export class TelemetryService'));
    assert.ok(result.skeletonContent.includes('sample(): number;'));
  });
});
