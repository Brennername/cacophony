import { TestBed } from '@angular/core/testing';
import { ExplorationControlComponent } from './exploration-control.component';
import { MockBackendService } from '../services/mock-backend.service';
import { of } from 'rxjs';

describe('ExplorationControlComponent', () => {
  let component: ExplorationControlComponent;
  let mockBackendService: MockBackendService;

  beforeEach(() => {
    mockBackendService = new MockBackendService();
    TestBed.configureTestingModule({
      declarations: [ExplorationControlComponent],
      providers: [
        { provide: MockBackendService, useValue: mockBackendService }
      ]
    });
    component = TestBed.createComponent(ExplorationControlComponent);
  });

  it('should create ExplorationControlComponent', () => {
    expect(component).toBeTruthy();
  });

  describe('getDominantModels', () => {
    it('should return the dominant model when only one is present', () => {
      const mockData = [{ model: 'ModelA', score: 90 }, { model: 'ModelB', score: 80 }];
      mockBackendService.mockGetResponse(
        '/api/pareto-frontier',
        of(mockData)
      );

      component.getDominantModels();
      expect(component.dominantModel).toEqual('ModelA');
    });

    it('should return the dominant model when multiple models have similar scores', () => {
      const mockData = [
        { model: 'ModelA', score: 90 },
        { model: 'ModelB', score: 85 },
        { model: 'ModelC', score: 85 }
      ];
      mockBackendService.mockGetResponse(
        '/api/pareto-frontier',
        of(mockData)
      );

      component.getDominantModels();
      expect(component.dominantModel).toEqual('ModelA');
    });

    it('should return null if no models are present', () => {
      mockBackendService.mockGetResponse(
        '/api/pareto-frontier',
        of([])
      );

      component.getDominantModels();
      expect(component.dominantModel).toBeNull();
    });
  });
});