# Content review log

Checkpoint: 2026-11-13. Reviewer: content correction pass.

## Status and limits

No lesson is fully signed off. The specification requires every rubric item to
pass, including end-to-end reading, arithmetic, objective coverage and reachable,
relevant references. A generated structural pass is not a human review. The
complete ledger below deliberately records pending status instead of inventing
283 sign-offs. Existing lessons are the scope of this checkpoint; new lessons and
problem-oracle work are integrated separately.

Six orientation lessons were read end to end in the first phase review. Their quiz mappings were based on the taught decisions, not automatic index cycling. Missing coverage led to one new multi-select and revised questions. Their exercises now have explicit checks and three hints. Firm language-stack claims, blanket office latency claims and model-risk guidance were corrected using current primary sources. No full sign-off is claimed because references and all rubric items still need final review.

Four thin lessons (`py-oop`, `spy-scipy`, `alg-graph-traversal`,
`pf-functions-scope`) were read end to end and expanded. This does not close their
remaining rubric checks. Other corrections are targeted reviews, not full reads.

## Independently recomputed prose examples

See `.truth-arithmetic-checks.json` for the recorded numeric evidence. Reproduce
the main corrections with Python:

```python
import math
# Retaining the delisted stock in the full initial universe matters.
true = 71 / 60 - 1
observed = 71 / 55 - 1
assert abs(true - 0.18333333333333335) < 1e-12
assert abs(observed - 0.2909090909090908) < 1e-12
assert abs((observed - true) * 100 - 10.757575757575747) < 1e-10
# Cash-or-nothing call under its stated risk-neutral model.
d2 = (math.log(100 / 100) + (0.03 - 0.5 * 0.3**2)) / 0.3
prob = 0.5 * (1 + math.erf(d2 / math.sqrt(2)))
assert abs(prob - 0.4800611941616275) < 1e-12
assert abs(1000 * math.exp(-0.03) * prob - 465.8732) < 0.0001
assert (19.96 - 20.04) * 3000 < -239.999999
assert 600 - 300 == 300
from scipy.stats import norm
assert abs(norm.cdf(-0.02, loc=0.0002, scale=0.01) - 0.0217) < 0.0001
```

Code-output checks run in both Python 3.11 and 3.12 where available. C++ lesson
checks are syntax-only, not proof of runtime behaviour. Explicit fragments and
missing optional dependencies remain deferred. GCC 11.4 is below the required
12; this is a failing environment check.

## Rubric backlog

The strict machine report is the detailed source of remaining objective mappings,
coverage, hints, success checks, length, explanations, distractor length, rootless
prerequisites and assessment findings. Link transport results in `.truth-urls.json`
do not establish source relevance. No batch is marked signed off while these
checks remain open.

## Lesson ledger

| Lesson | Status | Review scope / next step |
| --- | --- | --- |
| `orient-institution-landscape` | Pending | Read end to end; objective/question mapping, fairer rubrics, hints and explicit checks revised. Current-source corrections applied where relevant; final full rubric review remains open. |
| `orient-office-structure` | Pending | Read end to end; objective/question mapping, fairer rubrics, hints and explicit checks revised. Current-source corrections applied where relevant; final full rubric review remains open. |
| `orient-quant-developer-role` | Pending | Read end to end; objective/question mapping, fairer rubrics, hints and explicit checks revised. Current-source corrections applied where relevant; final full rubric review remains open. |
| `orient-role-comparison` | Pending | Read end to end; objective/question mapping, fairer rubrics, hints and explicit checks revised. Current-source corrections applied where relevant; final full rubric review remains open. |
| `orient-team-and-production` | Pending | Read end to end; objective/question mapping, fairer rubrics, hints and explicit checks revised. Current-source corrections applied where relevant; final full rubric review remains open. |
| `orient-what-is-quant-finance` | Pending | Read end to end; objective/question mapping, fairer rubrics, hints and explicit checks revised. Current-source corrections applied where relevant; final full rubric review remains open. |
| `alg-exponential-log` | Pending | Read end to end; corrected timing, formula conditions and rounded-equality claims. Added actual objective questions and exercise checks; independent arithmetic recorded. Full source/visual rubric remains open. |
| `alg-functions` | Pending | Read end to end; corrected model/domain claims and interactive strings, mapped actual coverage and added substantive questions/checks. Independent arithmetic recorded; full reference/visual rubric remains open. |
| `alg-polynomials` | Pending | Read end to end; repaired formulas and interactive parameters, actual objective assessment, exercise checks and independent residual arithmetic. Final reference/full rubric review remains open. |
| `alg-quadratics` | Pending | Read end to end; repaired formulas and interactive parameters, actual objective assessment, exercise checks and independent residual arithmetic. Final reference/full rubric review remains open. |
| `alg-sequences` | Pending | Read end to end; corrected timing, formula conditions and rounded-equality claims. Added actual objective questions and exercise checks; independent arithmetic recorded. Full source/visual rubric remains open. |
| `alg-simultaneous` | Pending | Read end to end; corrected model/domain claims and interactive strings, mapped actual coverage and added substantive questions/checks. Independent arithmetic recorded; full reference/visual rubric remains open. |
| `arith-estimation-mental-math` | Pending | Read end to end in arithmetic batch; genuine objective mapping, repaired quantitative examples, three hints and explicit checks. Final reference/rubric sign-off remains open. |
| `arith-fractions-decimals` | Pending | Read end to end in arithmetic batch; genuine objective mapping, repaired quantitative examples, three hints and explicit checks. Final reference/rubric sign-off remains open. |
| `arith-number-properties` | Pending | Read end to end in arithmetic batch; genuine objective mapping, repaired quantitative examples, three hints and explicit checks. Final reference/rubric sign-off remains open. |
| `arith-numbers-and-operations` | Pending | Read end to end in arithmetic batch; genuine objective mapping, repaired quantitative examples, three hints and explicit checks. Final reference/rubric sign-off remains open. |
| `arith-percentages` | Pending | Read end to end in arithmetic batch; genuine objective mapping, repaired quantitative examples, three hints and explicit checks. Final reference/rubric sign-off remains open. |
| `arith-powers-roots-logs` | Pending | Read end to end in arithmetic batch; genuine objective mapping, repaired quantitative examples, three hints and explicit checks. Final reference/rubric sign-off remains open. |
| `calc1-derivative-definition` | Pending | Read end to end; restored corrupted formulas, chain factor and units; added substantive domain/derivation questions and checks. Independent arithmetic recorded; full source/visual rubric remains open. |
| `calc1-differentiation-rules` | Pending | Read end to end; restored corrupted formulas, chain factor and units; added substantive domain/derivation questions and checks. Independent arithmetic recorded; full source/visual rubric remains open. |
| `calc1-exp-log-trig-derivatives` | Pending | Read end to end; corrected elasticity, stochastic scope, malformed formulas and limit claims. Added real epsilon-delta/base-exponential/combination coverage, checks and arithmetic. Full source/visual rubric remains open. |
| `calc1-limits-formal` | Pending | Read end to end; corrected elasticity, stochastic scope, malformed formulas and limit claims. Added real epsilon-delta/base-exponential/combination coverage, checks and arithmetic. Full source/visual rubric remains open. |
| `calc1-optimisation` | Pending | Read end to end; corrected local/global assumptions, finance normalisation, approximation order/errors and remainder bounds. Added real sign-chart/endpoint/construction/error coverage and checks. Full source/visual rubric remains open. |
| `calc1-taylor` | Pending | Read end to end; corrected local/global assumptions, finance normalisation, approximation order/errors and remainder bounds. Added real sign-chart/endpoint/construction/error coverage and checks. Full source/visual rubric remains open. |
| `calc2-improper-probability` | Pending | Read end to end; corrected integration, quadrature and density/moment errors; genuine objective assessment and executed numeric evidence added. Full source/visual rubric remains open. |
| `calc2-integrals-fundamental-theorem` | Pending | Read end to end; corrected integration, quadrature and density/moment errors; genuine objective assessment and executed numeric evidence added. Full source/visual rubric remains open. |
| `calc2-numerical-integration` | Pending | Read end to end; corrected integration, quadrature and density/moment errors; genuine objective assessment and executed numeric evidence added. Full source/visual rubric remains open. |
| `calc2-techniques` | Pending | Read end to end; corrected integration, quadrature and density/moment errors; genuine objective assessment and executed numeric evidence added. Full source/visual rubric remains open. |
| `disc-counting` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `disc-graphs-trees` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `disc-modular-recurrences` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `disc-sets-logic` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `dist-continuous-family` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `dist-derived` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `dist-discrete` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `dist-normal` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `geo-coordinate-geometry` | Pending | Read end to end; corrected domain, units and finance claims; added actual missing assessment coverage and checks. Sources/arithmetic reviewed selectively; full source/visual rubric remains open. |
| `geo-triangles-trig-ratios` | Pending | Read end to end; corrected domain, units and finance claims; added actual missing assessment coverage and checks. Sources/arithmetic reviewed selectively; full source/visual rubric remains open. |
| `geo-trig-identities` | Pending | Read end to end; corrected domain, units and finance claims; added actual missing assessment coverage and checks. Sources/arithmetic reviewed selectively; full source/visual rubric remains open. |
| `geo-unit-circle` | Pending | Read end to end; corrected domain, units and finance claims; added actual missing assessment coverage and checks. Sources/arithmetic reviewed selectively; full source/visual rubric remains open. |
| `la-determinants-rank` | Pending | Read end to end; corrected determinant conditioning, signed volume, real eigenexistence, normalisation and convergence claims. Added actual inverse/cofactor/diagonalisation/power assessment and NumPy evidence; full source/visual rubric remains open. |
| `la-eigen` | Pending | Read end to end; corrected determinant conditioning, signed volume, real eigenexistence, normalisation and convergence claims. Added actual inverse/cofactor/diagonalisation/power assessment and NumPy evidence; full source/visual rubric remains open. |
| `la-linear-systems` | Pending | Read end to end; restored expressions and row-operation subtraction, corrected queue-drain/HTTP/rank claims; genuine questions/checks and independent execution evidence. Full source/visual rubric remains open. |
| `la-matrices-operations` | Pending | Read end to end; corrected transition-step arithmetic, transpose/inverse, units, normalisation and independence claims. Actual basis/operation/definition assessment and NumPy checks added; full source/visual rubric remains open. |
| `la-orthogonality-projections` | Pending | Read end to end; corrected residual arithmetic, QR scope, covariance PSD/PD and eigenweight bounds. NumPy checks and actual objective assessments added; full source/visual rubric remains open. |
| `la-svd-covariance` | Pending | Read end to end; corrected residual arithmetic, QR scope, covariance PSD/PD and eigenweight bounds. NumPy checks and actual objective assessments added; full source/visual rubric remains open. |
| `la-vectors` | Pending | Read end to end; corrected transition-step arithmetic, transpose/inverse, units, normalisation and independence claims. Actual basis/operation/definition assessment and NumPy checks added; full source/visual rubric remains open. |
| `mvc-gradient-hessian` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mvc-lagrange` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mvc-multiple-integrals` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mvc-partial-derivatives` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `numa-errors-stability` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `numa-floating-point` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `numa-interpolation-differentiation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `numa-linear-systems-numerical` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `numa-root-finding` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-convexity` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-duality-kkt` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-gradient-methods` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-lp-qp` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pde-classification` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pde-finite-differences` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pde-heat-equation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prealg-inequalities` | Pending | Read end to end; substantive model/domain corrections, actual objective assessment, hints/checks and independent arithmetic. Final reference and full rubric sign-off remain open. |
| `prealg-solving-linear` | Pending | Read end to end; substantive model/domain corrections, actual objective assessment, hints/checks and independent arithmetic. Final reference and full rubric sign-off remain open. |
| `prealg-variables-expressions` | Pending | Read end to end; substantive model/domain corrections, actual objective assessment, hints/checks and independent arithmetic. Final reference and full rubric sign-off remain open. |
| `prealg-word-problems` | Pending | Read end to end; substantive model/domain corrections, actual objective assessment, hints/checks and independent arithmetic. Final reference and full rubric sign-off remain open. |
| `precalc-function-behaviour` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `precalc-growth-models` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `precalc-limits-intuition` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `precalc-modelling` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prob-conditional-bayes` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prob-expectation-variance` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prob-foundations` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prob-inequalities-convergence` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prob-random-variables` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prob-total-probability-conditional-expectation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `sca-change-of-measure` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `sca-ito-integral` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `sca-ito-lemma` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `stp-brownian-motion` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `stp-markov-chains` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `stp-martingales` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `stp-poisson-processes` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `di-normalisation-etl` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `di-streaming` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `di-tick-storage` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ll-kernel-bypass` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ll-latency-budgets` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ll-methodology` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ll-user-space-techniques` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pe-observability` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pe-reliability` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pe-security-config` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `tsmd-connectivity` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `tsmd-market-data-path` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `tsmd-matching-strategy` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `tsmd-oms-positions` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `arch-branch-prediction-oOO` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `arch-cache-hierarchy` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `arch-instruction-sets` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `arch-simd-numa` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cf-binary-hex` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cf-execution-model` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cf-hardware-software` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cf-integers-twos-complement` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `db-joins-aggregations` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `db-relational-sql` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `db-timeseries-columnar` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `db-transactions-indexes` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ds-fault-tolerance` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ds-replication-consistency` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ds-rpc-queues` | Pending | Read end to end; restored expressions and row-operation subtraction, corrected queue-drain/HTTP/rank claims; genuine questions/checks and independent execution evidence. Full source/visual rubric remains open. |
| `linux-monitoring-ssh` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `linux-permissions-processes` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `linux-pipes-scripting` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `linux-terminal-filesystem` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `net-latency` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `net-models-ip` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `net-sockets` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `net-tcp-udp` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `os-processes-threads` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `os-synchronisation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `os-syscalls-io` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `os-virtual-memory` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `swe-build-systems` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `swe-design-patterns` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `swe-git` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `swe-testing` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-asyncio` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-cpp-interop` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-gil-threading` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-object-model` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-profiling` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pf-arrays-strings-debugging` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pf-control-flow` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pf-functions-scope` | Pending | Read end to end; expanded body with runnable examples. Remaining strict checks and references open. |
| `pf-variables-types` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pf-what-is-programming` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-collections` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-control-functions` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-files-errors` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-iterators-generators-decorators` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `py-oop` | Pending | Read end to end; expanded body and attribute semantics corrected. Remaining strict checks and references open. |
| `py-setup-syntax` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `spy-numpy` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `spy-numpy-linalg` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `spy-pandas` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `spy-scipy` | Pending | Read end to end; expanded body and lower-tail cdf calculation corrected. Remaining strict checks and references open. |
| `spy-visualisation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-arrays-strings` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-compilation-model` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-control-functions` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-references-pointers` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-structs-enums-namespaces` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-types-variables` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-classes` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-inheritance` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-object-lifetime-oop` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-operator-overloading` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-polymorphism` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-dynamic-allocation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-lifetime-bugs` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-move-semantics` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-raii` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-rule-of-five` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-shared-weak-ptr` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-storage-duration` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-unique-ptr` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-stl-adaptors` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-stl-associative` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-stl-iterators-algorithms` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-stl-memory-traits` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-stl-vector` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-chrono-fs-ranges` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-concepts-traits` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-constexpr` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-lambdas-optional-variant` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-templates` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-value-categories` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-internals-abi` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-internals-linking` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-internals-optimisation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-internals-vtable-layout` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-atomics` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-futures-async` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-lock-free` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-mutexes` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-threads` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-allocators-pools` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-benchmarking-profiling` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-branchless-simd` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-cache-locality` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-production-debugging` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-testing-frameworks` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cpp-tooling` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `alg-dynamic-programming` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `alg-graph-traversal` | Pending | Read end to end; expanded body; corrected Kahn leftover interpretation. Remaining strict checks and references open. |
| `alg-greedy-backtracking` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `alg-searching-sorting` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `alg-shortest-paths-mst` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `alg-two-pointers-sliding` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cx-amortised` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cx-big-o` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `cx-recurrences` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ds-advanced-structures` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ds-arrays-lists` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ds-hash-tables` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ds-stacks-queues` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ds-trees-bst` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `qalg-orderbook-structures` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `qalg-randomized` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `qalg-simulation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `qalg-streaming` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `lr-constraints` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `lr-deduction` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `lr-truth-tables` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `apt-patterns-estimation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `apt-percentages-ratios` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `apt-profit-interest` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pb-classic-puzzles` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pb-expected-value` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pb-optimal-stopping` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pb-random-walks-ruin` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `psm-framework` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `psm-unfamiliar-practice` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `bt-data-biases` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `bt-lookahead-costs` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `bt-overfitting-validation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `bt-strategy-evaluation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `fin-inflation-real` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `fin-money-institutions` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `fin-npv-irr` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `fin-time-value` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `fi-bond-pricing-yield` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `fi-duration-convexity` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `fi-rate-sensitivity` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `fi-yield-curve` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `inst-bonds-overview` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `inst-equities-funds` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `inst-futures-forwards` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `inst-swaps-fx-credit` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mkt-bid-ask-liquidity` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mkt-order-types` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mkt-participants` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mkt-structure` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mic-adverse-selection` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mic-matching` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mic-order-books` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `mic-spreads-impact` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-binomial` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-black-scholes` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-greeks` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-payoffs` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-put-call-parity` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `opt-volatility-surfaces` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pf-diversification-frontier` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pf-factor-models-attribution` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pf-mean-variance-capm` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `pf-performance-ratios` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `risk-drawdown-hedging` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `risk-es-stress` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `risk-taxonomy` | Pending | Read end to end; fixed 50bp prompt mismatch, modified-duration units, overbroad taxonomy claims and current model-risk guidance; mapped six questions and revised rubrics/hints/checks. Explicit prerequisite review remains open. |
| `risk-var` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ml-foundations` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ml-pitfalls-deployment` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ml-trees-boosting` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `qm-assumptions-calibration` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `qm-validation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `stat-bootstrap-permutation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `stat-descriptive-sampling` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `stat-hypothesis-testing` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `stat-mle-confidence` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `stat-regression` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ts-arima` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ts-cointegration` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ts-garch` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `ts-stationarity` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prc-binomial-engine` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prc-calibration-validation` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prc-finite-difference-pricing` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prc-forwards-futures-pricing` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |
| `prc-monte-carlo-engine` | Pending | Automated structural, prose and executable checks only; full rubric review remains open. |


## Phase0 source checks, 2026-11-13

- Python math.fsum: https://docs.python.org/3/library/math.html#math.fsum
  describes accurate partial summation and a possible double-rounding caveat,
  not an unconditional exact-summation guarantee.
- Jane Street: https://www.janestreet.com/what-we-do/ identifies trading,
  research and technology overlap, ETFs, and core software written largely in OCaml.
- Two Sigma: https://www.twosigma.com/ identifies quantitative investment,
  trading, research and technology. Replaces its missing /about/ page.
- Hull publisher page, opened and read:
  https://www.pearson.com/en-gb/subject-catalog/p/options-futures-and-other-derivatives-global-edition/P200000004519?view=educator
- BlackRock: https://www.blackrock.com/corporate/about-us identifies asset
  management and technology. Optiver: https://www.optiver.com/what-we-do/
  identifies quantitative trading and liquidity provision.
- CME: https://www.cmegroup.com/education/courses/clearing/what-is-clearing
  explains central counterparty roles and financial safeguards.
- Current model-risk guidance:
  https://www.federalreserve.gov/frrs/guidance/supervisory-guidance-on-model-risk-management.htm
  is dated April 17, 2026 (SR 26-2), is risk-based supervisory guidance, and
  explicitly recognises exceptions to validation before first use with controls.
  It is not an enforceable prescriptive standard. Internal release policy and
  applicable law remain separate. The production lesson no longer teaches the
  old framework as a universal legal pre-use approval rule.
- Atlassian: https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment
  supports the distinction between tested integration and deployment decisions.
- CFA Institute search evidence supports rough sell-side office groupings; full
  PDF relevance verification remains pending, so this is not a reference sign-off.

## Short-answer self-consistency check

The strict checker now passes each model answer into the actual TypeScript grader. Twenty-one existing-lesson rubrics were repaired with conceptual alternative groups after this found self-rejections. It also exposed two damaged formulas in model answers and an overclaim about monotonic arenas avoiding all upstream allocations. Those were corrected. A passing model answer does not prove that every fair paraphrase passes or that an incorrect answer cannot match the keywords. Assessment `assess-cpp-knowledge:cpp-q9` belongs to a separately integrated revision; its old snapshot remains a known failure in this checkpoint.


## Arithmetic batch, 2026-11-13

Read all six arithmetic lessons end to end. Recomputed money with Decimal,
fractions with Fraction, and growth/error examples with Python. Recorded results
are in `.truth-arithmetic-batch.json`. These checks cover the listed examples,
not a claim that every statement elsewhere is verified.

- Repaired `47,42=5` to subtraction, removed currency labels on remainders,
  and distinguished positive-divisor Euclidean division from language-specific
  negative-divisor conventions.
- Restored missing mid/spread exercise results, subtraction in the remaining
  tranche check and damaged subtraction signs in hints/formula flashcards.
- Replaced the incorrect reversal of a 3% recovery with division by 1.03.
  The implied low is 95.6311 from a starting100 and ending98.5, a4.3689% drop
  from the starting value under that stated peak assumption.
- Corrected six cents divided by a20.01-dollar mid to0.29985%, not0.03%.
  Kept the unit conversion visible and removed an unsupported tradability claim.
- Product relative errors include the cross term; opposite-direction rounding
  alone does not establish the final sign. A universal10% tolerance is not safe.
- Added positivity/domain conditions for exponent and log laws, distinguished
  the nonnegative square root from both quadratic roots, and stated the
  uncorrelated equal-variance assumptions behind square-root-of-time scaling.
- Removed claims that every TLS handshake uses huge-prime multiplication or
  that Euclid is always the fastest practical method. Scoped the RSA connection.
- Replaced questions when an actual objective was otherwise untested, including
  explanatory digit-sum coverage and all three logarithm identities. Added broad
  number-set classification rather than relying on one irrational-number item.
- Removed the last three position-letter references from pricing explanations.

Opened and checked replacement references before editing URLs:
https://www.mathsisfun.com/rounding-numbers.html
https://www.mathsisfun.com/prime_numbers.html
https://www.mathsisfun.com/exponent.html
The historical TLS1.3 specification at
https://www.rfc-editor.org/info/rfc8446/ confirms static RSA key exchange was
removed and other authentication methods are possible. This source is used for
that limited protocol fact, not to teach a complete current security design.

All six arithmetic lessons have zero strict per-lesson findings except the
entry lesson's empty-prerequisite review flag. No false dependency was added.
That flag and final source/rubric review remain open; none is fully signed off.
A new regression test feeds every authored lesson's short model answer through
the actual grader. The suite is33/33 on this checkpoint's283-lesson snapshot.


## Prealgebra batch, 2026-11-13

Read all four prealgebra lessons end to end. Decimal recomputations are in
`.truth-prealgebra-batch.json`. All four have zero strict per-lesson findings;
this is not full source/rubric sign-off.

- Repaired damaged subtraction syntax in expressions, hints, summaries and
  flashcards, preserving executable code and expected output.
- Defined signed-position PnL using closing minus opening price, so a short
  opens with a sale and closes with a purchase. Borrow charges and other
  omitted costs are named rather than silently covered by the simple formula.
- Reversed both incorrect broker-choice interpretations: a no-fixed-fee,
  higher-rate broker wins on small positive trade values; a fixed-fee,
  lower-rate broker wins above the crossing. Checked at1,000 and10,000 dollars.
- Stated nonzero-divisor conditions for rearrangement, preserved approximate
  versus exact equality, and explained that rounded fee displays can agree
  without the unrounded algebraic values being equal.
- Distinguished an acceptable realised exit price from a stop order's actual
  execution. Fees and gap risk are outside the simplified inequality; a stop
  level is not a guaranteed loss cap.
- A fractional solution is not automatically a bad model. Feasibility follows
  from explicit unit, sign, precision and exact-versus-minimum target constraints.
  The exercise using a16.632-dollar price now states the allowed price increment.
- Added assessment content for variable/constant distinction, substitution
  verification, and model/domain checking instead of tagging unrelated questions
  to fill missing objective coverage. Both exercises in each lesson now have
  an observable success check and three hints.

Tests33/33, TypeScript and strict execution were rerun. Whole-project schema and
truth remain red on the unintegrated snapshot; no external account effects,
curriculum changes or unrelated feature work are included in this batch.


## First algebra pair, 2026-11-13

Read quadratics and polynomials end to end. Numerical checks are recorded in
`.truth-algebra-batch.json`. Both have zero strict per-lesson failures after
substantive question coverage and exercise checks. Final reference and visual
interactive verification remain open, so no full sign-off is claimed.

- Restored missing minus signs in quadratic profit models, their factored
  solutions, polynomial substitution checks and FunctionPlotter fn expressions.
- A rounded root1.2656 of2x^2+3x-7 gives residual0.00028672, not exactly zero.
  Replaced the false displayed zero with the actual residual and precision caveat.
- Clarified a=0 degeneracies, coefficient roles, nonzero product-degree rules,
  integer-root tests versus general roots, and the limits of a failed factor hunt.
- Removed the false general claim that hanging cables are parabolas, the claim
  that every polynomial is evaluated by Horner in every numerical library, and
  an unconditional numerical-stability claim.
- Scoped vertex optimisation as a one-variable model result, not an exact recipe
  for every constrained portfolio or multivariable least-squares problem.
- Current delta/gamma Taylor wording uses half gamma for the quadratic term.
- Added questions for coefficient/degree classification and actual polynomial
  expansion rather than assigning unrelated questions to untested objectives.

FunctionPlotter in the supplied interim UI does not consume expressions[];
main was notified for primary UI integration. The two corrected fn strings are
compatible with its current scalar contract, but actual plotted pixels have not
been inspected by this content pass. Structural truth is not visual sign-off.


## Systems and functions pair, 2026-11-13

Read both lessons end to end. Independent Decimal checks are recorded in
`.truth-algebra2-batch.json`. Both have zero strict per-lesson findings and the
actual-grader suite remains33/33; full source and visual checks remain pending.

- The systems motivation paired50,000 dollars of capital at4%/9% with a75,000
  annual return target, contradicting its actual3,250-dollar worked example.
  Corrected the motivation and scoped the rates as hypothetical planning inputs.
- Restored both minus signs in the two-line interactive and used expressions[]
  for the actual line pair. This depends on primary's multi-curve renderer.
- Added actual matrix-form assessment rather than only a determinant slogan.
  Nonzero determinant means exact uniqueness, not numerical good conditioning.
- The functions lesson incorrectly said G(r)=250,000(1+r) has a range starting
  at250,000 without defining r>=0. With r>=-1, its range instead starts at zero.
  Added genuine domain/range questions and distinguished inversion on a range
  from two-sided inversion on an explicitly stated codomain.
- A fee-inversion objective was untested by the old quiz. Added a worked numeric
  inversion with ordering and forward-check explanation instead of a generic
  composition-output question.


## Exponentials and sequences pair, 2026-11-13

Read both lessons end to end. Zero strict per-lesson findings; actual-grader
suite33/33 and tsc pass. Decimal/libm computations recorded in
`.truth-algebra3-batch.json`. These are not complete source/visual sign-offs.

- A quiz claimed a10% fall followed by rounded11.11% rise restores the price
  exactly. It gives0.99999 times the start, not1; only the repeating reciprocal
  is exact. Restored that distinction in the question and explanation.
- Distinguished interpolated doubling time from whole-year interest credit
  dates and nominal-rate comparisons from equal-effective-yield comparisons.
- The annuity exercise hint omitted the first discounted factor1/1.05, making
  its geometric sum start at time0 while its prompt starts at time1. Repaired
  the derivation, retaining the independently verified20,759.32-dollar answer.
- Added zero-rate annuity limit, positive-rate perpetuity and bond principal
  caveats. An invariant preserved by a loop is not itself a termination proof.
- Added substantive all-log-law, half-life, finite-geometric-sum and finite
  annuity questions; these topics were previously untested by the quiz.
- Sources opened and read: https://mathworld.wolfram.com/GeometricSeries.html
  distinguishes sums starting at0 from1 and convergence; and
  https://mathworld.wolfram.com/Logarithm.html states real-log domain/base
  requirements and the product/quotient/power identities. Other reference and
  visual rubric items remain open.


## Geometry module, 2026-11-13

Read all four existing geometry lessons end to end. Zero strict per-lesson
findings,33/33 actual-grader tests, tsc pass. Independent libm arithmetic and
unit-error counterexample recorded in `.truth-geometry-batch.json`. No visual
sign-off or complete reference rubric is claimed.

Material corrections:
- A supposedly delta-hedged book had fixed positive delta0.6. Recast it as an
  explicit affine stock-plus-cash model, not delta-neutral. Distinguished local
  delta, return beta, and signed/normalised modified duration. A raw price-time
  chart slope is not a return, and differently dimensioned axes need scaling.
- The coordinate exercise hint wrongly said both changes were negative even
  though Delta x was+6. Added vertical/horizontal and coincident-line caveats.
- The triangle lesson recommended sin^2+cos^2 as a degrees/radians bug detector.
  That identity also passes at the wrong shared argument. Added an explicit
  known-value check and mathematical counterexample rather than claiming it
  validates units. A drawn price triangle does not define Sharpe ratio.
- Tower heights now state instrument level; straight cable ignores sag. Corrected
  a VectorVisual gridSize key to the actual gridRange key.
- Radians lesson said radius2 times angle1.5 gives3 'radius-units', a unit error:
  if radius is2 metres the arc is3 metres, not3 radii. Unit bookkeeping remains
  necessary. Removed blanket claims that every API accepts only radians.
- Trig identities lesson falsely attributed Fourier mode independence to the
  pointwise Pythagorean identity. Replaced it with full-period inner-product
  orthogonality, separate from statistical independence.
- Fixed period for negative frequency, zero-frequency degeneracy, amplitude
  magnitude, and phase-angle versus horizontal-shift units. Corrected a quiz's
  explanation that referred to a nonexistent squared term in option4.
- Added real missing assessment content: midpoint, unit-circle coordinates,
  cosine rule, phase/amplitude graph reading, identity derivation, and signed
  sine double-angle reconstruction. No placeholder objective tags.

Sources opened/read for the relevant claims:
https://mathworld.wolfram.com/LawofCosines.html
https://mathworld.wolfram.com/Radian.html
https://mathworld.wolfram.com/FourierSeries.html
These do not constitute full reference review of every lesson claim.


## Derivative definition and differentiation rules pair, 2026-11-13

Both read end to end. Independent Decimal checks in
`.truth-calculus-pair-batch.json`. Zero scoped strict findings,33/33 actual-grader
tests and tsc pass. No full source/visual sign-off.

- Restored missing subtraction operators in difference-quotient, central-
  difference, quotient-rule and average-vs-marginal flashcards.
- The chain-rule pitfall multiplied by the inner derivative twice: it gave
  6(2x+1)^2*2 as the correct derivative. Restored3(2x+1)^2*2=6(2x+1)^2.
- The derivative lab expression had corrupted x^3-3x to 'x^3, 3*x'. Repaired
  the function and its caption using actual DerivativeLab parameter names.
- Corrected raw bond price derivative vs modified duration, derivative units,
  one extra discrete unit vs infinitesimal marginal cost, and forward square
  difference6.001 vs6.002. Actual roundoff remains distinct from algebra.
- Removed a claim that a central difference always has equal cost/superior
  numerical accuracy; account for cached values, smoothness and roundoff.
- The quotient/chain quiz incorrectly ruled out expanding a rational function
  and differentiating its powers term by term. Reframed it as a direct-rule
  approach rather than claiming one necessary route.
- Power rule's arbitrary-real-exponent claim now carries x>0 domain, with
  negative/fractional and endpoint coverage questions. Finite binomial proof
  is labelled positive-integer, not a proof for all real exponents.

Opened sources: https://mathworld.wolfram.com/Derivative.html and
https://mathworld.wolfram.com/FiniteDifference.html (limit definitions, rules,
real-power domains, smooth truncation formulas and roundoff warning). Finance
arithmetic is independently recomputed, not a full reference audit.


## Linear systems and RPC/queues, 2026-11-13

Both read end to end in response to primary's expression-parser findings.
Minimal3-expression patch was delivered separately first. This batch is based
on those fixes and does not revert them. Zero scoped strict findings,33/33
actual-grader tests and tsc pass. Source/visual rubric remains open.

- Corrected producer1200/s, backlog12000,60-second drain from1200/s consumer
  to1400/s when arrivals continue. Matching arrivals never drains the backlog.
- Corrected one-minute overload caption from 'minutes of staleness' to12 seconds
  of queued work. Clarified fluid FIFO assumptions and after-scale message wait.
- HTTP safety permits incidental logs; idempotence concerns intended effects,
  not identical responses. Replaced blanket4xx-never-retry/5xx-always-retry with
  operation-aware bounded policies, including429 Retry-After. Queues can block
  producers on acknowledgements and backpressure, and replay is not universal.
- Cold TLS1.2 example request RTT was inconsistently1 ms with0.5 ms RTT; corrected.
  Pooling saves aggregate request latency, not necessarily the same wall-clock
  or CPU time when requests overlap.
- Restored row-operation minus signs and the linear-system code caption. Pivot
  columns, not every row, determine uniqueness after consistency is checked.
- X^T X is PSD, only SPD for full-column-rank X. A rank-deficient counterexample
  has Gram eigenvalues0 and28. Explicitly forming it squares the2-norm condition
  number; Cholesky is not a universal stabler regression method. QR/SVD and
  numpy.linalg.lstsq are valid alternatives under their documented semantics.

Evidence in `.truth-queue-linear-batch.json`: actual NumPy solve/residual,
rank/eigenvalue counterexample and backlog/latency arithmetic. Sources opened:
https://numpy.org/doc/stable/reference/generated/numpy.linalg.solve.html
https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html
https://developer.mozilla.org/en-US/docs/Glossary/Safe/HTTP
https://developer.mozilla.org/en-US/docs/Glossary/Idempotent
https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
The M/M/1 caption source was separately read:
https://www.cise.ufl.edu/~nemo/cop5615/queuing.html
Not all other lesson reference claims have full source review.


## Limits and exponential/log/trig derivatives pair, 2026-11-13

Both read end to end. Zero scoped strict findings,33/33 actual-grader tests
and tsc pass. Independent arithmetic in `.truth-calculus2-batch.json`. Full
source/visual rubric remains open.

- Demand Q=200exp(-1.5p) was called constant-elasticity and its solution cancelled
  a nonexistent denominator p. Correct elasticity is-1.5p, hence-3 at p=2.
  The constant quantity is semi-elasticity Q_prime/Q=-1.5 per unit price.
  Contrasted power demand200p^(-1.5), which really has constant elasticity-1.5.
- Every positive exponential has constant proportional rate, not only e^x.
  Base e gives the special rate1. Added actual difference-quotient derivation.
- Ordinary S_prime/S assumes a positive differentiable path; nonzero-volatility
  geometric Brownian sample paths need Ito calculus instead. Removed the claim
  that they all differentiate with ordinary deterministic rules.
- Limits lesson's statement exp(r) contradicted its general-time exp(rt) formula;
  repaired. Continuity alone does not justify Taylor accuracy. A0/0 form is
  not always resolved by cancelling a common factor.
- The limit exercise hint claimed both factors contain x-1, even though the
  correct factorisation is(x-1)(x-3). Repaired, with success checks.
- Restored minus signs in epsilon-delta and numeric flashcards. Corrected a
  'six decimals' comparison that displayed only four. Added actual base2,
  fourth-trig-derivative, product/chain and numeric epsilon-delta questions.
- Repaired malformed interactive quotient(x^2-9)/(x-3) from a corrupt functions
  key to actual fn contract. A sampled line can miss the hole; caption now says
  this rather than pretending the renderer visibly proves single-point absence.
  Converted exp/ln comparison to expressions[] for primary's renderer.

Sources opened: https://mathworld.wolfram.com/Limit.html and
https://mathworld.wolfram.com/GeometricBrownianMotion.html, plus derivative/rule
sources in the prior batch. Demand correction follows directly from the
independently checked derivatives; broader economic-reference review remains
pending.


## Optimisation and Taylor pair, 2026-11-13

Both read end to end. Zero scoped strict findings,33/33 actual-grader tests and
tsc pass. Independent errors/bounds in `.truth-calculus3-batch.json`. No full
source/visual sign-off. This completes an end-to-end teaching read of the six
existing Calculus1 lessons, not the whole project's editorial review.

- Critical-point curvature tests now state stationarity/smoothness; a second-
  derivative sign at one point is not a global convexity claim. Closed-interval
  extrema require continuity. Added actual first-derivative sign chart and
  endpoint-maximum assessment.
- Positive gamma improves the local quadratic term relative to tangent PnL,
  not guaranteed profit in both directions. Delta-hedged does not mean convex.
- Cubic example has two stationary points, not three; its inflection at0 has
  derivative-3. Repaired another corrupt x^3-3x plot expression. Grid search
  uses121 evaluations, not a thousand, and need not find an off-grid optimum.
- sqrt(4.1) first-order error is1.54e-4, not2.5e-4. Sine x-x^3/6 is cubic,
  not second-order. Its0.2955 value does not have five-decimal agreement with
  sin(0.3)=0.2955202... . Restored sin-series minus signs in flashcards.
- Duration and convexity are normalised risk measures, not raw P_prime and
  P_second/2 Taylor coefficients. Updated the assessment accordingly.
- Added a genuine remainder-bound derivation with interval-wide derivative
  control. More terms do not guarantee fixed decimal improvements or convergence
  to an arbitrary smooth function. Actual construction/error questions added.
- UI-owned TaylorLab numerical derivatives fail catastrophically at high order
  on the interim source: exp-at0 true derivatives all1, but its order6 is6.94,
  order8 is1.56e7 and order9 is-5.98e10. Reported to primary via main; not edited
  or treated as visually verified here.

Source opened/read for coefficient/remainder/convergence claims:
https://openstax.org/books/calculus-volume-2/pages/6-3-taylor-and-maclaurin-series
Broader finance/source/visual rubric remains pending.


## Vectors and matrix operations pair, 2026-11-13

Both read end to end. Zero scoped strict findings,33/33 actual-grader tests,
tsc pass. Independent NumPy checks in `.truth-linear-pair-batch.json`. Full
source/visual rubric remains open.

- Matrix exercise calculated M^2, then multiplied by Ms (the three-step state)
  while labelling the result two steps. Its final two-step number happened to
  be right, but the displayed calculation was not. Corrected to M^2*s using
  the original state and verified both sequential/squared routes. M^2*Ms is
  instead(0.6688,0.3312), not its claimed(0.672,0.328).
- The same exercise hint confused rows and columns in computing outputs.
  Restored row dot products and the equivalent weighted-columns reading.
- Transpose is not generally an operation that undoes a matrix; that is the
  inverse. Corrected the analogy, dimensions of identity matrices and the
  transpose-order caveat for special commuting cases.
- Diagonal covariance gives uncorrelatedness, not general independence.
  Transition matrices also need nonnegative entries, not merely sums of1.
- Vector addition of separately normalised funds is not their combined weight
  vector. Require a shared capital denominator or capital-weighted averaging.
- Closure alone is not a complete vector-space definition. Added axioms versus
  subspace criterion; long-only weights summing to1 are not a subspace.
- Normalisation and cosine-angle need nonzero vectors. Negative dot product
  implies an obtuse angle, not exact opposite arrows (the given example is
  about100.08 degrees). Restored a corrupted dot-product flashcard.
- PCA basis changes versus truncation and exact-dependence coefficient
  nonuniqueness are distinguished from unsupported claims of automatic
  double-counted risk or universally meaningless predictions.
- Corrected static VectorVisual/MatrixTransform captions that promised dragging
  controls not present in the interim component. Matrix[[2,1],[0,1]] scales
  horizontally and shears; it does not leave vertical lines fixed.
- Added real basis, vector representation, addition/scaling and matrix-property
  assessment content instead of arbitrary objective labels.

Supporting source excerpts inspected:
https://numpy.org/doc/stable/reference/generated/numpy.dot.html
https://numpy.org/doc/stable/reference/generated/numpy.inner.html
https://statproofbook.github.io/P/norm-corrind.html
Broader textbook/reference and visual review remains open. UI MatrixTransform's
non-unit-square source polygon was separately reported to primary via main.


## Determinants/rank and eigen-analysis pair, 2026-11-13

Both read end to end. Zero scoped strict findings,33/33 actual-grader tests,
tsc pass. NumPy counterexamples and inverse/rank checks recorded in
`.truth-linear2-batch.json`. Full source/visual rubric remains open.

- A tiny determinant is not a scale-invariant near-singularity test. Counter-
  example1e-6*I has det1e-12 and condition1; diag(1e12,1e-12) has det1 but
  condition1e24. Replaced the determinant-warning-light finance framing.
- Absolute determinant scales area/volume; the sign gives orientation. Full
  inverse verification now checks every entry, not two entries then a claim.
- C+lambda*I is diagonal loading/ridge, not the only/general shrinkage form.
  Covariance ellipsoid volume is proportional to square root determinant at a
  fixed level, with units/dimension dependence, not unqualified risk-cloud size.
- Not every real matrix has a real eigendirection:90-degree rotation has+i,-i.
  Negative eigenvalues reverse an arrow; zero collapses it. The determinant
  condition means existence of a nonzero null vector, not any fixed chosen v.
- PCA eigenvalue-as-variance requires unit-normalised vectors. Largest mode
  means a unit-sphere variance maximum, not best among leveraged portfolios;
  explained share requires positive total variance and is not portfolio risk
  contribution. Uncorrelated is not independence.
- Transition eigenvalue1 alone does not ensure convergence. The alternating
  two-state chain cycles forever. Added finite irreducible/aperiodic conditions
  as a sufficient standard setting and stated row/column orientation.
- Corrected static matrix caption that promised dragging and falsely said every
  direction except(1,1) bends, ignoring the other eigendirection(1,-2).
- Added substantive cofactor/inverse-entry/diagonalisation/matrix-power quiz
  content; those objectives previously lacked genuine assessment coverage.

Source excerpts inspected:
https://numpy.org/doc/stable/reference/generated/numpy.linalg.cond.html
https://numpy.org/doc/stable/reference/generated/numpy.linalg.eigh.html
Other broader claims and visual review remain open; numerical counterexamples
are execution evidence rather than full source sign-off.


## Orthogonality/QR and SVD/covariance pair, 2026-11-13

Read both end to end. Orthogonality independent solution falsely summed
-1/6+4/6-1/6 to zero and substituted2/3 for the middle residual1/3. Both
checks corrected. QR description now assumes independent columns, distinguishes
least squares from exact equality, avoids an explicit inverse, and does not
claim classical Gram-Schmidt is a production-stable cure for ill-conditioning.
Normalising each accepted residual immediately is valid; removed the contrary
common-mistake claim. Orthonormality alone does not imply decorrelated returns.

Covariance quiz q3 wrongly selected symmetric+det>0 as sufficient PD: -I in two
dimensions disproves it. Corrected question, explanation and related material.
PSD, not necessarily PD, is enough for a valid covariance. Complete sample
covariance rank <=min(n,T-1); insufficient observations cause singularity, not
indefiniteness. Leading-principal-minor criterion is for PD, not a general
nonnegative-leading-minor PSD test. Guided exercise wrongly inferred unit norm
from fully invested weights; now uses variance bounds scaled by||w||^2.
Other corrections: squared percentage-point units, unit PCA eigenvectors,
positive-trace share, no guaranteed yield-mode percentage, rectangular SVD
extra zeros, diagonal loading vs shrinkage, honest code-output rounding, and
current sklearn PCA covariance_eigh support instead of universal no-covariance
claims. Actual Gram-Schmidt, normal-equation, covariance, variance-share and
Sylvester assessment questions added, not arbitrary objective tags.

Executed evidence `.truth-linear3-batch.json` verifies both regression residual
orthogonality, Gram-Schmidt basis, QR reconstruction, sample covariance, SVD
component variances, negative-identity counterexample and loaded covariance.
Source pages read:
https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html
https://numpy.org/doc/stable/reference/generated/numpy.linalg.qr.html
https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.PCA.html
Full source/visual/project rubric remains open. No UI changes in this batch.


## Full Calculus2 module editorial pass, 2026-11-13

Four lessons read end to end. This brings existing-snapshot editorial coverage
to49/283 read/corrected and234 not yet read;0 fully signed off. Full source,
visual and project rubric checks remain open; do not present structural success
as complete lesson sign-off. Numeric and counterexample evidence is in
`.truth-calculus2-module-batch.json`.

FTC: corrected the false claim that doubling left-rectangle resolution quarters
error. Computed10/20/40 left sums2.28/2.47/2.5675 for x^2 on[0,2], showing
roughly halving error. The guided100-panel check is43.5608, not43.88.
Added continuous-function FTC scope, accumulation derivative part, power-rule
exception/domain, and repaired a flashcard whose subtraction became a period.

Techniques: repaired-1=2A in the independent partial-fraction identity and a
missing-minus integration-by-parts flashcard. One point check does not prove a
rational identity; recombine numerators and differentiate back. Repeated factors
and irreducible quadratics are not all logarithms. Stated zero-rate exponential
case, domain poles and separation of derivative verification from convergence
and endpoint arithmetic. Added real partial-fraction and discounted-integral
questions for previously unassessed objectives.

Numerical: corrected convexity sign reasoning, error bound versus actual error,
and Richardson fine-grid divisor3 (trapezoid) or15 (Simpson). n64 narrowly
misses the stated strict1e-5 trapezoid tolerance: actual error1.0172526e-5;
n128 gives2.5431315e-6. A small grid difference does not guarantee accuracy.
Added validated generic trapezoid/Simpson code and a derivative-bound example
requiring n130 for x^2 at tolerance1e-5. Removed false universal library/CDF
quadrature claims and guaranteed refinement ratios from Big-O alone.

Improper/probability: corrected Phi(1)=0.841345 versus central one-sigma mass
0.682689; density versus survival exponents; finite mass versus finite moments;
the loss-density mean1 but infinite variance; wrong tail antiderivative sign;
missing subtraction in exponential area caption; and false doubling of survival
when hazard halves. Stated positive constant hazard/support. Corrected median
versus mean and misleading VaR-as-integral/entire-risk-profile assertions. Added
actual improper-limit and loss-tail calculations to assess missing objectives.

Sources inspected for claims, not complete reference/pixel sign-off:
https://openstax.org/books/calculus-volume-1/pages/5-3-the-fundamental-theorem-of-calculus
https://openstax.org/books/calculus-volume-2/pages/3-4-partial-fractions
https://openstax.org/books/calculus-volume-2/pages/3-6-numerical-integration
https://openstax.org/books/calculus-volume-2/pages/3-7-improper-integrals
https://docs.scipy.org/doc/scipy/tutorial/stats/continuous_lomax.html
Some were targeted source excerpts, not full-page review. NumPy/SciPy execution
checks cited worked calculations; these do not establish universal pedagogy or
visual rendering. All four scoped strict checks,33 grader tests and TypeScript
must be rerun before each package release.
