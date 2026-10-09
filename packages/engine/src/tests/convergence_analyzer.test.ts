import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConvergenceAnalyzer } from "../analytics/ConvergenceAnalyzer.js";

describe("ConvergenceAnalyzer Suite (T85.2)", () => {
  it("calculates discrete velocity and acceleration deltas across series", () => {
    // Steady improvement: 50 -> 60 -> 75
    // Delta 1: 60 - 50 = +10
    // Delta 2: 75 - 60 = +15 (velocity = 15)
    // Acceleration: 15 - 10 = +5
    const { velocityDelta, accelerationDelta } = ConvergenceAnalyzer.calculateDerivatives([50, 60, 75]);
    assert.equal(velocityDelta, 15);
    assert.equal(accelerationDelta, 5);
  });

  it("handles series with fewer than 3 elements", () => {
    const single = ConvergenceAnalyzer.calculateDerivatives([70]);
    assert.equal(single.velocityDelta, 0.0);
    assert.equal(single.accelerationDelta, 0.0);

    const double = ConvergenceAnalyzer.calculateDerivatives([70, 80]);
    assert.equal(double.velocityDelta, 10.0);
    assert.equal(double.accelerationDelta, 0.0);
  });

  it("detects plateau when window delta rate is below epsilon", () => {
    // 78.5% short window vs 80.0% long window -> difference 1.5% <= 2.5% epsilon
    const plateau = ConvergenceAnalyzer.detectPlateau(78.5, 80.0, 2.5);
    assert.equal(plateau.isPlateaued, true);
    assert.equal(plateau.deltaRate, 1.5);

    // 60.0% short window vs 80.0% long window -> difference 20.0% > 2.5% epsilon
    const divergence = ConvergenceAnalyzer.detectPlateau(60.0, 80.0, 2.5);
    assert.equal(divergence.isPlateaued, false);
    assert.equal(divergence.deltaRate, 20.0);
  });

  it("classifies error logs into in-situ mitigation vs architectural triage", () => {
    const syntaxErrors = [
      "SyntaxError: Unexpected token '{'",
      "Error: Cannot find module './utils.js'",
    ];
    const syntaxAnalysis = ConvergenceAnalyzer.evaluateFailureMode(syntaxErrors);
    assert.equal(syntaxAnalysis.signature, "SYNTAX_OR_IMPORT");
    assert.equal(syntaxAnalysis.resolutionStrategy, "IN_SITU_MITIGATION");

    const stubErrors = [
      "Generated template contains empty placeholder stub: <div>TODO</div>",
      "Stub rejection: method body is empty",
    ];
    const stubAnalysis = ConvergenceAnalyzer.evaluateFailureMode(stubErrors);
    assert.equal(stubAnalysis.signature, "EMPTY_STUB");
    assert.equal(stubAnalysis.resolutionStrategy, "ARCHITECTURAL_TRIAGE");
  });
});
