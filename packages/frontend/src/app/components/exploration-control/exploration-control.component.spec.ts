import { TestBed } from '@angular/core/testing';
import { ExplorationControlComponent } from './exploration-control.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

describe('ExplorationControlComponent', () => {
  let component: ExplorationControlComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [ExplorationControlComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    component = TestBed.inject(ExplorationControlComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should trigger API PUT and update local activePolicy signal on policy change', () => {
    const newPolicy = { id: 'new-policy-id', name: 'New Policy' };
    component.activePolicy$.subscribe(policy => {
      expect(policy).toEqual(newPolicy);
    });

    component.changePolicy(newPolicy);

    const req = httpMock.expectOne('api/policy');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(newPolicy);

    req.flush(newPolicy);
  });
});