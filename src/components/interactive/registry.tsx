'use client';
import LAB_PARAMS from '@/lib/lab-params.generated.json';

import * as React from 'react';
import { LabFrame } from './core';
import { NumberLine, FractionVisual, CompoundGrowth, FunctionPlotter, DerivativeLab, IntegralLab, TaylorLab, VectorVisual, MatrixTransform, MonteCarloPi } from './math-labs';
import { ProbabilitySimulator, DistributionViewer, RandomWalk, BrownianMotion, ConfidenceIntervalLab, MarkovChainSim, NormalConvergence, RegressionLab, TimeSeriesDecompose } from './probability-labs';
import { BlackScholesLab, PayoffDiagram, GreeksLab, YieldCurveLab, EfficientFrontier, BinomialTreeLab, VolatilitySmile, OrderBookVisual, MatchingSim } from './finance-labs';
import { MemoryLayout, ComplexityCompare, SortingVisual, HashTableVisual, BSTVisual } from './cs-labs';
import { TerminalSteps, PipePipeline, PermissionBits, PacketJourney, JoinVisual, LatencyBudget, PercentileExplorer, OrderStateMachine, MemoryPool, CovarianceLab, FloatErrorLab } from './systems-labs';

export const REGISTRY: Record<string, React.ComponentType<{ params: Record<string, unknown> }>> = {
  NumberLine, FractionVisual, CompoundGrowth, FunctionPlotter, DerivativeLab,
  IntegralLab, TaylorLab, VectorVisual, MatrixTransform, MonteCarloPi,
  ProbabilitySimulator, DistributionViewer, RandomWalk, BrownianMotion,
  ConfidenceIntervalLab, RegressionLab, TimeSeriesDecompose,
  BlackScholesLab, PayoffDiagram, GreeksLab, YieldCurveLab, EfficientFrontier,
  BinomialTreeLab, VolatilitySmile, OrderBookVisual, MatchingSim,
  MemoryLayout, ComplexityCompare, SortingVisual, HashTableVisual, BSTVisual,
  MarkovChainSim, NormalConvergence,
  TerminalSteps, PipePipeline, PermissionBits, PacketJourney, JoinVisual,
  LatencyBudget, PercentileExplorer, OrderStateMachine, MemoryPool,
  CovarianceLab, FloatErrorLab,
};

export function InteractiveBlock({ component, params, caption }: { component: string; params: Record<string, unknown>; caption?: string }) {
  const Comp = REGISTRY[component];
  if (!Comp) {
    return (
      <LabFrame title="Interactive demo unavailable" note="">
        <p className="text-[15px] text-faint">The component “{component}” is not registered. This is a content error, please report it.</p>
      </LabFrame>
    );
  }
  // The lab only reads the params it declares. Anything else in the lesson's config is ignored, so say so
  // instead of silently showing default values as if they were the lesson's.
  const supported = (LAB_PARAMS as Record<string, string[]>)[component];
  const ignored = supported ? Object.keys(params ?? {}).filter(k => !supported.includes(k)) : [];
  return (
    <>
      <Comp params={params ?? {}} />
      {ignored.length > 0 && (
        <p role="note" className="mt-2 text-[12px] font-bold text-faint">
          This lesson sets options this demo does not read yet ({ignored.join(', ')}), so the demo may not match the lesson text.
        </p>
      )}
    </>
  );
}
