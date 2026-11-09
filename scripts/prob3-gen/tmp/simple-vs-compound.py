import sys

def main():
    data = sys.stdin.buffer.read().decode().split()
    P = float(data[0])
    r = float(data[1])
    t = int(data[2])
    factor = 1.0 + r / 100.0
    compound = P
    for _ in range(t):          # repeated multiplication, exactly t times
        compound = compound * factor
    simple = P * (r / 100.0) * t
    diff = compound - simple
    if diff < 0:
        diff = -diff
    print(f"{diff:.2f}")

main()
