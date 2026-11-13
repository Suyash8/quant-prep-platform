from decimal import Decimal, getcontext
from fractions import Fraction
getcontext().prec = 80

def p(md): return {'type': 'p', 'md': md}
def math(tex): return {'type': 'math', 'tex': tex}
def callout(variant, title, md): return {'type': 'callout', 'variant': variant, 'title': title, 'md': md}
def h2(text): return {'type': 'h2', 'text': text}

def rnd(x, places, margin=Decimal('1e-8')):
    """Round Decimal/Fraction x half up to `places` decimals; raise if x is within `margin` (in output units) of a rounding tie."""
    d = Decimal(x.numerator) / Decimal(x.denominator) if isinstance(x, Fraction) else Decimal(x)
    scaled = d * (Decimal(10) ** places)
    fl = scaled.to_integral_value(rounding='ROUND_FLOOR')
    frac = scaled - fl
    if abs(frac - Decimal('0.5')) < margin: raise AssertionError('near rounding tie')
    c = int(fl) + (1 if frac > Decimal('0.5') else 0)
    return c

def fixed(c, places):
    neg = c < 0; c = abs(c); s = f"{c // 10**places}.{c % 10**places:0{places}d}" if places else str(c)
    return ('-' if neg and c != 0 else '') + s
