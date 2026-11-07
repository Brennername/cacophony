import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { DocCommentModalComponent } from './doc-comment-modal.component.js';
import { DocCommentService } from '../../../services/doc-comment.service.js';

describe('DocCommentModalComponent', () => {
  let fixture: ComponentFixture<DocCommentModalComponent>;
  let component: DocCommentModalComponent;
  let componentRef: ComponentRef<DocCommentModalComponent>;
  let mockDocService: Partial<DocCommentService>;

  beforeEach(async () => {
    mockDocService = {
      candidates: vi.fn().mockReturnValue([
        {
          id: 'cand-1',
          functionIdentifier: 'calculateRatio',
          filePath: 'src/math.ts',
          candidateText: '/**\n * Calculates ratio between values.\n */',
          status: 'PENDING',
          modelId: 'qwen2.5-coder:7b',
          createdAt: new Date().toISOString(),
        },
      ]) as any,
      selectedCandidate: vi.fn().mockReturnValue({
        id: 'cand-1',
        functionIdentifier: 'calculateRatio',
        filePath: 'src/math.ts',
        candidateText: '/**\n * Calculates ratio between values.\n */',
        status: 'PENDING',
        modelId: 'qwen2.5-coder:7b',
        createdAt: new Date().toISOString(),
      }) as any,
      isGenerating: vi.fn().mockReturnValue(false) as any,
      isInjecting: vi.fn().mockReturnValue(false) as any,
      error: vi.fn().mockReturnValue(null) as any,
      loadCandidates: vi.fn().mockResolvedValue([]),
      synthesize: vi.fn().mockResolvedValue({
        id: 'cand-2',
        functionIdentifier: 'calculateRatio',
        filePath: 'src/math.ts',
        candidateText: '/**\n * Refined doc.\n */',
        status: 'PENDING',
        modelId: 'qwen2.5-coder:7b',
        createdAt: new Date().toISOString(),
      }),
      inject: vi.fn().mockResolvedValue(true),
      selectCandidate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DocCommentModalComponent],
      providers: [
        { provide: DocCommentService, useValue: mockDocService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocCommentModalComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('isOpen', true);
    componentRef.setInput('filePath', 'src/math.ts');
    componentRef.setInput('functionIdentifier', 'calculateRatio');
    componentRef.setInput('functionSignature', 'public calculateRatio(a: number, b: number): number');

    fixture.detectChanges();
  });

  it('should render modal elements, signature, and candidate preview when open', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.title')?.textContent).toContain('calculateRatio()');
    expect(compiled.querySelector('.file-path')?.textContent).toContain('src/math.ts');
    expect(compiled.querySelector('.signature-box')?.textContent).toContain('public calculateRatio');
    expect(compiled.querySelector('.code-preview')?.textContent).toContain('Calculates ratio between values.');
  });

  it('should trigger reroll synthesis when reroll button is clicked', async () => {
    component.userGuidance.set('explain edge cases');
    await component.onReroll();

    expect(mockDocService.synthesize).toHaveBeenCalledWith({
      filePath: 'src/math.ts',
      functionIdentifier: 'calculateRatio',
      userGuidance: 'explain edge cases',
      previousCandidate: '/**\n * Calculates ratio between values.\n */',
    });
    expect(component.statusMessage()).toBe('New candidate synthesized');
  });

  it('should trigger accept and injection when accept button is clicked', async () => {
    await component.onAcceptAndInject();

    expect(mockDocService.inject).toHaveBeenCalledWith({
      filePath: 'src/math.ts',
      functionIdentifier: 'calculateRatio',
      commentText: '/**\n * Calculates ratio between values.\n */',
      candidateId: 'cand-1',
    });
    expect(component.statusMessage()).toBe('Comment injected successfully');
  });

  it('should close modal when close is called', () => {
    component.close();
    expect(component.isOpen()).toBe(false);
  });
});
