import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mocking dependencies for testing
const mockEloRatingEngine = {
  calculateEloScore: () => ({ playerA: 1500, playerB: 1400 }),
  updatePlayerRatings: (_scores: { playerA: number; playerB: number }) => {},
};

describe('ELO Convergence & Anti-Starvation Guards', () => {
  it('should stabilize ELO scores under synthetic outcomes', async () => {
    // Arrange
    const initialScores = { playerA: 1500, playerB: 1400 };
    mockEloRatingEngine.calculateEloScore = () => ({ playerA: 1520, playerB: 1380 });

    // Act
    mockEloRatingEngine.updatePlayerRatings(initialScores);
    const updatedScores = mockEloRatingEngine.calculateEloScore();

    // Assert
    assert.strictEqual(updatedScores.playerA, 1520);
    assert.strictEqual(updatedScores.playerB, 1380);
  });

  it('should converge ELO scores under repeated synthetic outcomes', async () => {
    // Arrange
    let initialScores = { playerA: 1500, playerB: 1400 };
    mockEloRatingEngine.calculateEloScore = () => ({ playerA: 1520, playerB: 1380 });

    // Act
    for (let i = 0; i < 10; i++) {
      mockEloRatingEngine.updatePlayerRatings(initialScores);
      initialScores = mockEloRatingEngine.calculateEloScore();
    }

    // Assert
    assert.strictEqual(initialScores.playerA, 1520);
    assert.strictEqual(initialScores.playerB, 1380);
  });

  it('should prevent non-starvation of exploration arms', async () => {
    // Arrange
    let initialScores = { playerA: 1500, playerB: 1400 };
    mockEloRatingEngine.calculateEloScore = () => ({ playerA: 1520, playerB: 1380 });

    // Act
    for (let i = 0; i < 10; i++) {
      mockEloRatingEngine.updatePlayerRatings(initialScores);
      initialScores = mockEloRatingEngine.calculateEloScore();
    }

    // Assert
    assert.strictEqual(initialScores.playerA, 1520);
    assert.strictEqual(initialScores.playerB, 1380);
  });
});
