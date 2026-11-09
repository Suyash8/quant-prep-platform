import sys

def fmt(s, k):
    t = (200 * s + k) // (2 * k)  # round-half-up of s/k to hundredths
    return f"{t // 100}.{t % 100:02d}"

def main():
    data = sys.stdin.buffer.read().decode().split()
    n = int(data[0])
    k = int(data[1])
    a = [int(x) for x in data[2:2 + n]]
    s = sum(a[:k])
    out = [fmt(s, k)]
    for i in range(k, n):
        s += a[i] - a[i - k]
        out.append(fmt(s, k))
    sys.stdout.write("\n".join(out) + "\n")

main()
