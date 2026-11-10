"""CONTENT-A verification of every number that will be added to the 10 lessons."""
import math

print("=== 1. geo-coordinate-geometry ===")
x = 3.5/2.5; y = 2*x - 1
print("intersection of y=2x-1 and y=-0.5x+2.5:", x, y, "check:", -0.5*x + 2.5)
d = abs(2*7 - 10 - 1)/math.sqrt(5)
print("dist (7,10) to y=2x-1:", d, "= 3/sqrt5 =", 3/math.sqrt(5))
print("dot of (1,2),(1,-0.5):", 1*1 + 2*(-0.5))
# point-slope via (1,2): y = -0.5(x-1)+2 = -0.5x + 2.5
print("perp line through (1,2): y = -0.5x + 2.5 -> check at x=1:", -0.5*1+2.5)
# weighted average / centroid of triangle (1,2),(7,10),(5,-4)?
print("midpoint of (1,2),(7,10):", (4,6))
# vertical line check: line through (6,11),(6,3) is vertical, slope undefined
print("gradient (6,11)->(6,3):", (3-11)/(6-6) if (6-6)!=0 else "undefined (vertical)")

print()
print("=== 2. geo-triangles-trig-ratios ===")
print("sin35 vs cos55:", round(math.sin(math.radians(35)),4), round(math.cos(math.radians(55)),4))
print("sin60 vs 2*sin30:", round(math.sin(math.radians(60)),4), 2*math.sin(math.radians(30)))
theta = math.acos(0.6)
print("arccos(0.6):", round(math.degrees(theta),2), "deg; sin:", round(math.sin(theta),4), "cos:", round(math.cos(theta),4))
print("10% move split: market", 10*0.6, "residual", round(10*math.sin(theta),4), "check hypot:", math.sqrt(6**2+8**2))
print("Var(X-Y) sx=7 sy=8 rho=.5:", 49+64-2*7*8*0.5, "vol:", round(math.sqrt(57),4))
print("special: sin30", 0.5, "sin45", round(math.sin(math.radians(45)),4), "sin60", round(math.sin(math.radians(60)),4))
print("cos30", round(math.cos(math.radians(30)),4), "cos45", round(math.cos(math.radians(45)),4), "cos60", 0.5)
print("tan30", round(math.tan(math.radians(30)),4), "tan45", 1.0, "tan60", round(math.tan(math.radians(60)),4))
print("cos30 deg exact:", round(math.cos(math.radians(30)),6))

print()
print("=== 3. geo-unit-circle ===")
print("1 rad in deg:", round(math.degrees(1),4))
print("pi/6:", round(math.pi/6,6), "sin(pi/6):", round(math.sin(math.pi/6),6), "cos(pi/3):", round(math.cos(math.pi/3),6))
print("sin(pi/4):", round(math.sin(math.pi/4),6), "cos(pi/4):", round(math.cos(math.pi/4),6))
print("sin(pi/3):", round(math.sin(math.pi/3),6), "tan(pi/3):", round(math.tan(math.pi/3),6))
print("sin(5pi/6):", round(math.sin(5*math.pi/6),6), "cos(5pi/6):", round(math.cos(5*math.pi/6),6))
print("sin(17pi/6) = sin(17pi/6 - 2pi)=sin(5pi/6):", round(math.sin(17*math.pi/6),6))
print("sin(-pi/6):", round(math.sin(-math.pi/6),6), "cos(-pi/6):", round(math.cos(-math.pi/6),6))
print("sin(0.1) vs 0.1:", round(math.sin(0.1),6))
print("sin(30 rad):", round(math.sin(30),4))
# correlation of sin and cos over a full period
import numpy as np
t = np.linspace(0, 2*math.pi, 100000, endpoint=False)
print("mean sin:", round(float(np.sin(t).mean()),6), "mean sin*cos:", round(float((np.sin(t)*np.cos(t)).mean()),6))
print("mean sin^2:", round(float((np.sin(t)**2).mean()),6), "(=0.5)")
# phase-shifted sinusoid: p(t) = 100 + 4 sin(2pi t/40 + pi/2) at t=0
print("p(0) with phase pi/2:", 100 + 4*math.sin(math.pi/2))
# 2pi/40 per day: how many turns in 100 days
print("turns in 100 days at period 40:", 100/40)

print()
print("=== 4. numa-root-finding ===")
# linearised implied vol: P(sig) = 10 + 36*(sig-0.20), market 10.72, root sig*=0.22
lo, hi = 0.15, 0.25
f = lambda s: 10 + 36*(s-0.20) - 10.72
print("root check:", 0.20 + 0.72/36)
for i in range(4):
    mid = (lo+hi)/2
    fm = f(mid)
    side = "right" if fm < 0 else "left"
    print(f"  iter {i+1}: bracket [{lo:.6f},{hi:.6f}] width {hi-lo:.6f}, mid {mid:.6f}, f={fm:+.4f}, root is {side}")
    if fm < 0: lo = mid
    else: hi = mid
print("final bracket:", lo, hi)
# Newton constant for x^2-2: C = f''/(2 f'(r)) = 2/(2*2*sqrt2) = 1/(2sqrt2)
C = 1/(2*math.sqrt(2))
print("Newton const 1/(2sqrt2):", round(C,4))
e = 1.5 - math.sqrt(2)
print("e0:", round(e,4), "C*e0^2:", round(C*e*e,6), "actual e1:", round(17/12 - math.sqrt(2),6))
print("e1:", 17/12-math.sqrt(2), "C*e1^2:", C*(17/12-math.sqrt(2))**2, "actual e2:", 577/408-math.sqrt(2))
# bisection budget from [0.15, 0.25] to 1e-4
print("steps to 1e-4 from width 0.10:", math.log2(0.10/1e-4))
# f(x) = (x-1)^2: Newton from x0=1.5
x = 1.5
for i in range(6):
    x = x - (x-1)**2/(2*(x-1))
    print("  double-root Newton iter:", x)

print()
print("=== 5. prealg-word-problems ===")
# together-rate: A in 6h, B in 3h
print("1/6+1/3 =", 1/6+1/3, "-> hours:", 1/(1/6+1/3))
# percent round trip
print("0.8*1.25 =", 0.8*1.25)
print("0.5*2 =", 0.5*2.0)
print("fall 10% then rise 11.1%?:", 0.9*1.11)
# volatility drag: +50% then -50%
print("1.5*0.5 =", 1.5*0.5, "sqrt:", math.sqrt(0.75), "-> per-period:", round(math.sqrt(0.75)-1,4))
# 30 and 45 minutes? do one more word problem: two analysts
print("1/2 + 1/4 =", 0.75, "-> 4/3 h =", 4/3)
# weighted average check example for averaging percentages trap
print("avg of 50% and -10% (equal capital):", (1.5+0.9)/2, "actual wealth:", 1.25)

print()
print("=== 6. calc2-improper-probability ===")
lam = 0.1
print("e^-1:", round(math.exp(-1),4), "e^-2:", round(math.exp(-2),4))
# E[X] via survival for exponential: int_0^inf e^{-lam t} dt = 1/lam
# for loss density 2/(1+x)^3: int_0^inf (1+t)^-2 dt = 1
print("survival tail of loss model at t:", 1/16, 0.0625)
from math import erf, sqrt
# P(Z>3):
pz3 = 0.5*(1-erf(3/sqrt(2)))
print("P(Z>3):", round(pz3,5), "ratio vs 1/16:", round(0.0625/pz3,1))
# normal within 1 sd
print("Phi(1):", round(0.5*(1+erf(1/sqrt(2))),4))
# Cauchy mean: E|X| diverges; tail ~ 1/(pi t): P(X>t) ~ 1/(pi t)
print("Cauchy tail approx at t=10:", round(1/(math.pi*10),5), "at t=100:", round(1/(math.pi*100),5))
print("normal tail at 10: ~", f"{0.5*(1-erf(10/sqrt(2))):.2e}")
# comparison test example: e^-x vs 1/x^2 for x>=1: e^-x <= e* ... simpler: x>=4 => e^-x <= x^-2
import numpy as np
xs = np.array([1,2,4,10])
print("e^-x vs x^-2:", [f"{math.exp(-x):.6f} vs {x**-2:.6f}" for x in [1,2,4,10]])

print()
print("=== 7. ds-arrays-lists ===")
cap, size, copies, events = 1, 0, 0, []
for append_n in range(1, 18):
    if size == cap:
        copies += cap
        cap *= 2
        events.append((append_n, cap, copies))
    size += 1
print("resize events (append#, newcap, totalcopies):", events)
print("total copies for 17 appends:", copies, " 2*17 =", 2*17)
print("cache line holds doubles:", 64//8)
print("8M doubles -> cache lines:", 8_000_000//8)
# malloc: 1000 arrays of 1000 vs one of 1e6? just note count
print("py list of 1M pointers (bytes):", 10**6*8)

print()
print("=== 8. spy-numpy ===")
P = np.array([101.5, 102.25, 100.75, 103.0])
simple = P[1:]/P[:-1] - 1
logret = np.log(P[1:]/P[:-1])
print("simple:", simple.round(6), "log:", logret.round(6))
print("sum of log rets vs ln(P3/P0):", logret.sum().round(8), round(math.log(103.0/101.5),8))
# standardise example
R = np.array([[0.01, 0.02],[-0.03, 0.01],[0.02, -0.01]])
mu = R.mean(axis=0); sd = R.std(axis=0, ddof=1)
print("mu:", mu.round(6), "sd:", sd.round(6))
Z = (R - mu)/sd
print("Z:", Z.round(4), "col means:", Z.mean(axis=0).round(8))
# uint8 overflow
a = np.array([250, 251, 252, 253, 254, 255], dtype=np.uint8)
with np.errstate(over='ignore'):
    print("uint8 +10:", a + np.uint8(10))
# dtype promotion
print("float32+float64 ->", (np.ones(2, dtype=np.float32) + np.ones(2)).dtype)
print("int64+float64 ->", (np.ones(2, dtype=np.int64) + np.ones(2)).dtype)
print("bool sum dtype:", (np.array([True,False,True])).sum().dtype)
# view vs copy
v = P[1:]
print("v.base is P:", v.base is P, "owndata:", v.flags.owndata)
c = P[[0,2]]
print("fancy copy base:", c.base is None)

print()
print("=== 9. spy-numpy-linalg ===")
A = np.array([[1.0,1.0],[0.08,0.12]])
print("cond(A):", round(float(np.linalg.cond(A)),3), "det:", round(float(np.linalg.det(A)),4))
# near-singular example
B = np.array([[1.0, 1.0],[1.0, 1.0000001]])
print("cond(B):", f"{float(np.linalg.cond(B)):.2e}")
b = np.array([1.0, 2.0])
w = np.linalg.solve(B, b); print("solve B:", w)
B2 = B.copy(); B2[1,1] += 1e-6
print("solve perturbed:", np.linalg.solve(B2, b), "delta:", np.linalg.solve(B2,b)-w)
C = np.array([[0.01,0.004],[0.004,0.04]])
vals, vecs = np.linalg.eigh(C)
print("vals:", vals.round(6), "trace:", C.trace(), "sum vals:", vals.sum().round(6))
print("det:", round(float(np.linalg.det(C)),8), "prod vals:", round(float(vals.prod()),8))
print("reconstruction err:", float(np.abs(vecs @ np.diag(vals) @ vecs.T - C).max()))
print("Q orthonormal err:", float(np.abs(vecs.T @ vecs - np.eye(2)).max()))
wv = np.array([0.5,0.5])
var = float(wv @ C @ wv)
print("portfolio var w=(.5,.5):", var, "vol:", round(math.sqrt(var),4))
# eigen check: var of eigenportfolios
print("var of top eigenportfolio:", float(vecs[:,-1] @ C @ vecs[:,-1]), "lambda:", vals[-1])
# cholesky
L = np.linalg.cholesky(C)
print("L:", L.round(6))
print("L@L.T err:", float(np.abs(L @ L.T - C).max()))
rng = np.random.default_rng(0)
Z = rng.normal(size=(4,2))
X = Z @ L.T
print("sample cov (4 draws):", np.cov(X, rowvar=False).round(5))
# singular covariance: T=250 obs, n=500 assets -> rank<=250
print("rank of 250x500 data:", np.linalg.matrix_rank(rng.normal(size=(250,500))))

print()
print("=== 10. alg-shortest-paths-mst ===")
INF = float("inf")
d = {"S":0.0, "A":INF, "B":INF, "C":INF}
edges = [("S","B",5),("A","B",-3),("S","A",4),("B","C",2)]
for p in range(1,4):
    changed = False
    for u,v,wt in edges:
        if d[u]+wt < d[v]:
            d[v] = d[u]+wt; changed = True
    print(f"pass {p}: {({k:(v if v!=INF else 'inf') for k,v in d.items()})} changed={changed}")
# arbitrage numbers
r1,r2,r3 = 0.9,0.8,1.4
prod = r1*r2*r3
wts = [-math.log(r) for r in (r1,r2,r3)]
print("product:", prod, "weights:", [round(w,5) for w in wts], "sum:", round(sum(wts),5))
print("profit on 1000:", 1000*prod - 1000)
# bigger loop to show logs beat products for many legs
print("ln(1.008):", round(math.log(1.008),5))
# MST vs shortest path separation: A-B 3, B-C 3, A-C 4
print("MST {AB,BC} weight:", 3+3, "; tree dist A->C:", 6, "; direct edge:", 4)
# kruskal trace of the same graph
edges2 = [("A","B",3),("A","C",4),("B","C",3)]
parent = {v:v for v in "ABC"}
def find(x):
    while parent[x]!=x:
        parent[x]=parent[parent[x]]; x=parent[x]
    return x
picked=[]
for u,v,w2 in sorted(edges2,key=lambda e:e[2]):
    ru,rv=find(u),find(v)
    if ru!=rv:
        parent[ru]=rv; picked.append((u,v,w2))
print("kruskal picks:", picked)
# floyd-warshall note: V=100 -> V^3 = 1e6
print("Floyd-Warshall ops at V=100:", 100**3, "at V=1000:", 1000**3)
# Dijkstra heap ops for E=4V, V=1000: E log V
print("E log2 V, E=4000 V=1000:", round(4000*math.log2(1000)))
