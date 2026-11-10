import math

print("=== 1. Compounding -> e ===")
for n in [1, 10, 100, 1000, 10000]:
    print(n, round((1 + 1/n)**n, 5))
print("1000*exp(1) =", round(1000*math.exp(1), 2))

print("\n=== 2. limit (x^2-4)/(x-2) near x=2 ===")
for x in [1.999, 2.001]:
    print(x, (x*x-4)/(x-2))

print("\n=== 3. Two-state Markov chain (exact) ===")
from fractions import Fraction
Pbb, Pbr, Prb, Prr = Fraction(9,10), Fraction(1,10), Fraction(1,2), Fraction(1,2)
a = Fraction(1,1)
# solve a*Pbb + (1-a)*Prb = a
# a*0.9 + 0.5 - 0.5a = a  -> 0.4a = 0.5 -> a = 5/4? check
# a*0.9 + (1-a)*0.5 = a  => 0.9a + 0.5 - 0.5a = a => 0.4a + 0.5 = a => 0.5 = 0.6a => a = 5/6
a = Fraction(1,2) / Fraction(3,5)  # 0.5/0.6 = 5/6
print("pi_B =", a, "=", float(a))
pi = [a, 1-a]
print("piR =", pi[1])
# check pi P = pi
lhs_B = pi[0]*Pbb + pi[1]*Prb
lhs_R = pi[0]*Pbr + pi[1]*Prr
print("piP = ", lhs_B, lhs_R)
# two-step
P2bb = Pbb*Pbb + Pbr*Prb
P2br = Pbb*Pbr + Pbr*Prr
P2rb = Prb*Pbb + Prr*Prb
P2rr = Prb*Pbr + Prr*Prr
print("P2 =", P2bb, P2br, P2rb, P2rr, " floats:", [float(x) for x in (P2bb,P2br,P2rb,P2rr)])
# iteration code-output simulation
p = [1.0, 0.0]
M = [[0.9, 0.1], [0.5, 0.5]]
for _ in range(3):
    p = [p[0]*M[0][0] + p[1]*M[1][0], p[0]*M[0][1] + p[1]*M[1][1]]
    print(round(p[0], 3), round(p[1], 3))

print("\n=== 4. Gambler's ruin p=0.45, barriers -3/+3, start 0 ===")
r = 0.55/0.45
i, N = 3, 6
Phit = (1 - r**i) / (1 - r**N)
print("r =", r, "r^3 =", r**3, "r^6 =", r**6)
print("P(hit +3 first) =", Phit)
exp_stop = 3*Phit - 3*(1-Phit)
print("E[stopped value] =", exp_stop)

print("\n=== 5. Poisson ===")
lam = 12.0
print("mean interarrival minutes:", 1/lam, "seconds:", 60/lam)
t = 10/60
print("P(no order in 10s) =", math.exp(-lam*t), "P(>=1) =", 1-math.exp(-lam*t))
t = 0.5
p2 = math.exp(-lam*t) * (lam*t)**2 / math.factorial(2)
print("P(N=2 in 30s) =", p2, round(p2,4))
lam_c = 0.02
print("P(no default in 5y) =", math.exp(-lam_c*5))

print("\n=== 6. BM scaling ===")
dt = 1/252
print("sqrt(1/252) =", math.sqrt(dt))
print("0.20*sqrt(1/252) =", 0.20*math.sqrt(dt), round(0.20*math.sqrt(dt), 4))
print("0.20*sqrt(5/252) =", 0.20*math.sqrt(5/252), round(0.20*math.sqrt(5/252), 4))

print("\n=== 7. QV / total variation ===")
n = 1000
dt = 1/n
print("std of realised QV:", round(math.sqrt(2/n), 3), math.sqrt(2/n))
print("typical total variation n=1000:", round(math.sqrt(2*n/math.pi), 1), math.sqrt(2*n/math.pi))
n = 10000
print("typical total variation n=10000:", round(math.sqrt(2*n/math.pi), 1), math.sqrt(2*n/math.pi))
print("ito isometry theta=W: int_0^1 E[W^2] dt =", 1/2)

print("\n=== 8. GBM Euler-Maruyama vs exact ===")
S0, mu, sigma, dtm = 100.0, 0.08, 0.20, 1/12
for z in [0.5, -1.0]:
    step_euler = S0 * (1 + mu*dtm + sigma*math.sqrt(dtm)*z)
    step_exact = S0 * math.exp((mu - 0.5*sigma**2)*dtm + sigma*math.sqrt(dtm)*z)
    print(f"z={z}: euler={step_euler} -> {round(step_euler,2)}  exact={step_exact} -> {round(step_exact,2)}")
print("monthly vol sigma*sqrt(1/12) =", sigma*math.sqrt(1/12))
print("monthly drift mu*dt =", mu/12)
print("E[S_1]/S0 = exp(0.08) =", math.exp(0.08))
print("median = exp(0.06) =", math.exp(0.06))
print("vol drag sigma^2/2 =", 0.5*sigma**2)

print("\n=== 9. FD explicit step ===")
u = [0.0, 1.0, 4.0, 1.0, 0.0]
rr = 0.16
v = u[:]
for j in range(1, 4):
    v[j] = u[j] + rr * (u[j+1] - 2*u[j] + u[j-1])
print(v)
print(sum(u[1:4]), sum(v[1:4]), "loss:", sum(u[1:4])-sum(v[1:4]))
# r for dt=0.01, dx=0.25
print("r =", 0.01/0.25**2)
# amplification worst mode
for r_ in [0.16, 0.5, 0.6]:
    print("r =", r_, "worst-mode amplification g =", 1 - 4*r_)

print("\n=== 10. heat mode decay ===")
print("exp(-pi^2*0.05) =", math.exp(-math.pi**2*0.05))

print("\n=== 11. precalc modelling ===")
# broker crossover
n = 1000
print("A(500) =", 5 + 0.01*500, "B(500) =", 0.015*500)
print("A(2000) =", 5 + 0.01*2000, "B(2000) =", 0.015*2000)
print("crossover: 5 = 0.005n -> n =", 5/0.005)
# doubling
print("ln2/ln1.07 =", math.log(2)/math.log(1.07))
print("1.07^10 =", 1.07**10)
# breakeven units
for q in [153, 154]:
    R = 25*q; C = 2000 + 12*q
    print(q, "R =", R, "C =", C, "profit =", R-C)
# share PnL transform
print("breakeven S for 100S - 5010:", 5010/100)

print("\n=== 12. misc precalc ===")
def f(x): return x*x
def g(x): return f(x-3) + 1
print("g(1) =", g(1))
print("sqrt domain example ok")

print("\n=== 13. martingale fair game exact ===")
from fractions import Fraction as Fr
e_next = Fr(1,2)*(0+1) + Fr(1,2)*(0-1)
print("E[M1] =", e_next)
# biased walk single-step E
print("biased E[step] =", 0.45*1 + 0.55*(-1))

print("\n=== 14. heat FD implicit diagonal ===")
r_ = 0.16
print("1+2r =", 1 + 2*r_)
print("C-N: 1+r =", 1 + r_)

print("\n=== 15. stock PnL line for function-behaviour indep ex ===")
S = 50.10
print("PnL at 50.10:", 100*S - 5010)
S = 52.00
print("PnL at 52:", 100*S - 5010)
S = 49.50
print("PnL at 49.50:", 100*S - 5010)

print("\n=== 16. quadratic variation MC sanity (deterministic statement only) ===")
print("E[sum (dW)^2] with n=1000, dt=1e-3:", n * dt)

print("\n=== 17. code-output: rounding strings ===")
for n in [10, 100]:
    print(repr(round((1 + 1/n)**n, 5)))
import math
lam, t = 12, 0.5
print(repr(round(math.exp(-lam*t) * (lam*t)**2 / 2, 4)))
S0, mu, sigma, dtm = 100, 0.08, 0.20, 1/12
z = 0.5
print(repr(round(S0 * (1 + mu*dtm + sigma*math.sqrt(dtm)*z), 2)))
print(repr(round(S0 * math.exp((mu - 0.5*sigma**2)*dtm + sigma*math.sqrt(dtm)*z), 2)))
n_ = 1000
print(repr(round(math.sqrt(2 / n_), 3)))
print(repr(round(math.sqrt(2 * n_ / math.pi), 1)))
print(repr(round(0.20 * math.sqrt(1/252), 4)))
print(repr(round(0.20 * math.sqrt(5/252), 4)))
