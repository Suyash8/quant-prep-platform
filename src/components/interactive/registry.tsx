'use client';

import * as React from 'react';
import { LabFrame } from './core';
import { normalizeLabParams } from './param-aliases';
import { ClientMd } from '@/components/gamified/client-md';
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
  const normalized = normalizeLabParams(component, params);
  return (
    <figure className="my-2">
      <Comp params={normalized} />
      {caption && (
        <figcaption className="mt-2 text-[13px] font-semibold text-muted">
          <ClientMd text={caption} />
        </figcaption>
      )}
    </figure>
  );
}
