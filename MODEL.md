# Model & Methodology

This document specifies, in full detail, the financial model behind the
calculator at https://sobolevbel.github.io/okicalc/ — what is being compared,
the exact year-by-year recursions, every assumption and its direction of
bias, the analytical cross-checks, and how the implementation is validated.

Legal state: the act of **3 July 2026** introducing Osobiste Konta
Inwestycyjne (OKI), signed by the President, in force from **1 January
2027**. Secondary regulations may still refine details; see
[Known unknowns](#9-known-unknowns).

---

## 1. What is being compared

Two ways of holding the same investment, with identical market performance,
differing only in taxation:

- **OKI (Osobiste Konto Inwestycyjne)** — income earned inside the account
  (capital gains, dividends, interest) is exempt from the 19% capital-income
  tax ("Belka tax"). Instead, an **annual fee on asset value** is charged on
  the average yearly value of assets **above an exemption limit**, profit or
  loss notwithstanding.
- **Regular brokerage account** — the classic regime: 19% Belka tax on
  realized capital gains at sale and on every dividend/interest payment when
  it is received.

The comparison metric is **wealth if liquidated at the end of year _n_**:
for OKI that is simply the account value (no exit tax); for the regular
account it is the market value minus the Belka tax due on the accumulated
unrealized gain. This puts both accounts on the same footing at every
horizon and is what the calculator plots.

### Why the outcome is non-obvious

A one-year comparison ("0.85% of assets vs 19% of one year's profit")
misses three dynamic effects:

1. **The fee base grows with the portfolio.** The asset fee is charged on
   the current (average) value, which compounds; a fixed exemption limit
   covers an ever-smaller fraction of it.
2. **Each fee payment leaves the compounding base.** Money paid out in
   year _k_ stops earning returns for all remaining years. The Belka tax,
   by contrast, is deferred until sale — deferral itself has value.
3. **The Belka burden is bounded; the fee is not.** The exit tax can never
   exceed 19% of the gain, i.e. asymptotically 19% of final wealth. The
   cumulative fee grows roughly linearly in time as a share of wealth and
   eventually overtakes it.

The result is a **non-monotonic advantage curve**: OKI typically leads for
the first one-to-three decades, the advantage peaks, then declines and
turns negative. Where the break-even lands depends mainly on the fee rate,
the return, the amount relative to the exemption limit, and the
contribution schedule. Making that curve visible is the calculator's
purpose.

---

## 2. Statutory parameters of OKI

| Parameter | Value | Notes |
|---|---|---|
| Belka exemption | full, for income on assets held in OKI | gains, dividends, interest |
| Asset-fee base | average yearly value of qualifying assets **above the limit** | charged also in loss years |
| Exemption limit | **100 000 zł** per person across all OKI accounts | includes a 25 000 zł sub-limit for savings products (deposits, savings bonds); the two do **not** add up to 125 000 zł |
| Fee rate, 2027 | **0.85%** (transitional, written into the act) | independent of NBP decisions in 2026 |
| Fee rate, 2028+ | **19% of the NBP reference rate** as of 31 October of the prior year, **rounded down to 2 decimals**, floor **0.1%** | no statutory ceiling |
| Limit valorization | frozen 2027–2029; indexed to inflation from **2030** | |
| Funding | new cash contributions only | existing portfolios cannot be transferred in |

Fee-rate examples under the statutory formula:

| NBP reference rate | OKI fee rate |
|---|---|
| 2.00% | 0.38% |
| 3.00% | 0.57% |
| 3.75% | 0.71% |
| 5.00% | 0.95% |
| 6.00% | 1.14% |

---

## 3. Notation

| Symbol | Meaning | Calculator control |
|---|---|---|
| `V0` | initial lump sum, zł | Starting amount |
| `c` | contribution per year, zł (12 × the monthly input) | Monthly contribution |
| `r` | nominal annual return (total, before taxes) | Expected annual return |
| `y` | dividend yield — the part of `r` paid out in cash (`0 ≤ y ≤ max(r, 0)`); 0 models an accumulating instrument | Dividend yield |
| `f` | OKI fee rate from 2028 | Fee-rate slider / NBP presets |
| `f₂₀₂₇` | first-year fee rate (0.85% if the transitional toggle is on, else `f`) | 2027 checkbox |
| `L0` | exemption limit at the start, zł | Tax-free limit |
| `π` | inflation used for limit valorization | Inflation slider |
| `t` | Belka tax rate (default 19%) | Belka rate |
| `n` | horizon in years | Horizon slider |

Year index `k = 0, 1, 2, …` corresponds to calendar years 2027, 2028, …
(the account is assumed opened at the start of 2027).

---

## 4. The simulation

Both accounts are advanced one year at a time with the same per-year return
`r(k)` (equal to the constant `r` unless the crash stress test of §4.4 is
enabled). The contribution is added at the **start** of each year (before
growth); mid-year contributions are not modelled.

### 4.1 OKI recursion

For each year `k`:

```
L(k)   = L0 · (1 + π)^max(0, k − 2)              # frozen for k = 0,1,2 (2027–2029)
f(k)   = f₂₀₂₇ if k = 0 else f
V     ← V + c                                     # contribution
fee(k) = f(k) · max( V · (1 + r)^0.5 − L(k), 0 )  # fee on average value above limit
V     ← V · (1 + r) − fee(k)                      # growth, then fee deducted
```

Two modelling choices here:

- **Average-value approximation.** The statute taxes the *average yearly*
  asset value. For a smoothly growing portfolio the geometric mid-year value
  `V·(1+r)^0.5` is an accurate stand-in. If secondary regulations define the
  average as a mean of daily or monthly readings, the difference is
  negligible for monotonic growth and grows only with intra-year
  volatility, which this deterministic model does not simulate anyway.
- **Fee paid from the account.** The fee is deducted from assets, so it
  reduces the compounding base (see [Known unknowns](#9-known-unknowns) —
  if the law ultimately allows paying it from external cash, OKI's position
  improves).

Dividends inside OKI are untaxed and simply remain part of `r` — no
separate code path is needed.

### 4.2 Regular-account recursion

The regular account must track its **cost basis** `B` (money on which tax
has already been settled), because the exit tax is due only on `V − B`:

```
V ← V + c            B ← B + c                    # contributions raise the basis
div     = V · y                                    # cash dividends
V ← V · (1 + r − y) + div · (1 − t)                # price growth + net dividends reinvested
B ← B + div · (1 − t)                              # reinvested net dividends raise the basis
```

Wealth if sold at the end of year `k`:

```
W(k) = V − t · max(V − B, 0)
```

For an accumulating instrument (`y = 0`) this collapses to the familiar
`W(n) = V0 + (1 − t) · V0 · ((1+r)^n − 1)` in the lump-sum case.

### 4.3 Outputs

For every year the simulator records: OKI value, regular-account
if-sold wealth `W`, the year's fee and cumulative fees, dividend tax paid,
the hypothetical exit tax, and the advantage `A(k) = V_OKI(k) − W(k)` in zł
and as a percentage of `W(k)`.

**Break-even year** = the last year with `A(k) > 0` (strict), scanning from
year 1 and stopping at the first non-positive year. 0 means OKI trails from
year one; values at the 50-year horizon cap are shown as "50+". Stopping at
the first loss matters: near zero returns the curve can dip early, and the
convention "last year before the first loss" is what the golden dataset
pins (e.g. 175 000 zł at 2% → year 2).

### 4.4 Crash stress test (optional overlay)

An opt-in deterministic overlay replaces the return in selected years:

```
r(k) = −d   if m > 0 and (k + 1) mod m = 0        # years m, 2m, 3m, …
     = r    otherwise
```

where `m` = crash frequency in years (`crisisEvery`, 0 = off) and `d` =
drawdown in a crash year (`crisisDrop`, e.g. 0.30). Design choices:

- **Deterministic, not random.** Crash years are fixed by the year number,
  so a shared scenario URL reproduces the exact same result and the values
  can be pinned by golden tests. This is a stress test showing the
  *direction and size* of the volatility effect, not a Monte Carlo forecast.
- **Both accounts see the same crash.** The asymmetry is in the levies: the
  OKI fee is charged on the average asset value even in a loss year, while
  the Belka tax applies only to realized profit — so crashes generally work
  against OKI (lower terminal gains shrink the tax OKI avoids, but fees are
  still paid along the way).
- **Dividends survive a crash.** The cash payout `y·V` is still made and
  taxed in a crash year (payouts are steadier than prices); the price return
  that year is `−d − y`.
- **Average return falls.** The overlay does not renormalize the good years
  upward; enabling it lowers the scenario's compound growth by construction.
- The break-even heatmap ignores the overlay (each column *is* a return
  level; overlaying crashes would falsify its meaning), just as it ignores
  contributions and dividends.

With `m = 0` the per-year return is the identical float `r`, and the
implementation is bit-for-bit equal to the base model — the golden tests
enforce this.

### 4.5 Payout phase (optional)

Instead of the default "sell everything at the horizon", the user can set a
net monthly withdrawal `w` (annualized `W = 12w`). After the `n` accumulation
years, contributions stop and each payout year proceeds as follows. The
global year index `j = n, n+1, …` keeps running, so the exemption-limit
valorization and the crash pattern continue seamlessly across the boundary.

**OKI** (withdrawals are tax-free; the fee never stops):

```
V ← V − W                       # start-of-year withdrawal, mirroring how
                                # contributions are added in accumulation
fee(j) = f · max(V·(1+r(j))^0.5 − L(j), 0)
V ← V·(1+r(j)) − fee(j)
```

**Regular account** (each sale immediately realizes its share of the gain):
to put `W` net in the investor's pocket, a gross amount `G` is sold. With
proportional cost-basis allocation, the taxable share of any sale is
`g = max(1 − B/V, 0)`, so `G − t·G·g = W` gives

```
G = W / (1 − t·g)
B ← B − G·(B/V)                 # basis leaves proportionally with the sale
V ← V − G
```

followed by the usual growth-and-dividend step (dividends are still paid and
taxed during payout, raising the basis by the reinvested net amount).
Realized losses are not carried forward — the same simplification as in the
accumulation phase (assumption bias: a small head start for OKI in losing
scenarios).

**Output:** the number of *full* years each account funds the withdrawal —
a year counts only if the start-of-year balance covers it (`V ≥ W` for OKI,
`V ≥ G` for the regular account). The count is capped at 100 and rendered as
"100+" when the portfolio outgrows the withdrawal.

Why this is interesting: the lump-sum exit is the *worst case* for the
regular account (the whole gain is taxed at once). Under gradual sale the
still-unrealized gain keeps compounding untaxed, while the OKI fee keeps
being charged on the remaining assets — so the payout phase shifts the
comparison toward the regular account, and on large above-limit portfolios
it can flip the verdict (golden test: 500k default scenario at 12 000 zł/mo
lasts 39 years on OKI vs 41 on the regular account, while the default 100k
scenario at 5 000 zł/mo lasts 31 vs 27 the other way).

The break-even heatmap ignores the payout phase, just as it ignores
contributions, dividends and crashes. With `w = 0` the payout code never
runs — the accumulation model is untouched.

---

## 5. Closed form (analytical cross-check)

With no contributions, no dividends, constant `f` and constant limit `L`,
and while the average value stays above the limit, the OKI recursion is
affine:

```
a = (1 + r) − f · (1 + r)^0.5
b = f · L
V(n) = aⁿ · V0 + b · (aⁿ − 1) / (a − 1)
```

The implementation is verified against this closed form to a relative error
below 10⁻¹² (see [Validation](#8-validation)). Note `a < 1 + r` always, and
`a < 1` when the fee exceeds growth — the portfolio then decays above the
limit, which the simulator handles with no special-casing.

## 6. Rule of thumb for the break-even horizon

Over `n` years the fee removes roughly `n · f / (1+r)^0.5` of final wealth
(each year's fee is ≈ `f` of the then-current value, discounted half a year
of growth). The Belka cost is `t · (1 − (1+r)^(−n))` of final wealth, which
is bounded by `t`. Equating the two for large amounts (limit negligible):

```
n* ≈ t / f
```

≈ 22 years at `f = 0.85%`, ≈ 27 years at `f = 0.71%`. The exemption limit
pushes the true break-even later (strongly for portfolios near 100 000 zł),
low returns pull it earlier, and regular contributions push it much later,
because the fixed limit covers most of the portfolio in the early years.

Sensitivity of the break-even for a 1 000 000 zł lump sum (horizon 60,
constant fee all years):

| Fee rate | at 4% | at 5% | at 7% | at 10% |
|---|---|---|---|---|
| 0.38% | 50 | 54 | 57 | 58 |
| 0.57% | 22 | 29 | 35 | 38 |
| 0.71% | 9 | 18 | 26 | 30 |
| 0.85% | 0 | 9 | 19 | 24 |
| 1.14% | 0 | 0 | 8 | 15 |

The fee rate is by far the strongest parameter of the model.

---

## 7. Assumptions and their bias

Each simplification below notes which account it favors:

1. **Loss carryforward not modelled** (regular accounts can offset losses
   against gains for 5 years). Favors **OKI** slightly, only in scenarios
   with negative returns.
2. **Fee deducted from assets**, not paid externally. Favors the **regular
   account**; if the final rules allow external payment, OKI improves.
3. **Deterministic constant return** — no volatility, no sequence risk.
   Neutral by construction; note the fee is charged on average value, so
   high volatility with flat drift would slightly raise the real fee burden
   relative to this model.
4. **Contributions at the start of the year**, average value approximated
   by the mid-year point. Second-order effect.
5. **Constant fee rate from 2028** at the user-chosen value. Reality will
   float with NBP; the sensitivity table above shows the stakes.
6. **The 25 000 zł savings sub-limit is out of scope** — the model covers
   investment assets against the overall 100 000 zł limit.
7. **Instrument eligibility is not modelled.** Whether specific foreign
   instruments (e.g. Irish accumulating ETFs) qualify for OKI is still
   uncertain; verify per instrument.
8. **IKE/IKZE are not compared.** They are separate wrappers with their own
   limits and rules; combining them with OKI is a portfolio-design question
   beyond this tool.
9. **Nominal, not real.** Deflating both accounts by the same index never
   changes the winner, so results are presented in nominal zł. Inflation
   enters only through limit valorization (from 2030) and through the fact
   that Belka taxes nominal gains — both captured by the model's inputs.

---

## 8. Validation

The engine ships with a golden-value test suite (`tests/engine.test.js`,
`node --test`) that pins its exact arithmetic:

- a full **16 × 14 break-even table** (lump sums 25 000 → 2 000 000 zł ×
  returns −1% → 15%, constant 0.85% fee, fixed limit) — integer-exact for
  all 224 cells;
- **advantage curves** for 500 000 zł and 2 000 000 zł at 7% at eight
  checkpoints between years 1 and 30, exact to ±1 zł and ±0.01 pp;
- the **closed form** of §5 against the recursion (rel. error < 10⁻¹²);
- **fee-rate sensitivity** (the table in §6), **limit valorization** and
  **contribution** scenarios;
- edge cases: fee charged in loss years, no tax below basis, dead heat
  below the limit at zero return, dividend drag on the regular account,
  and the statutory fee-rate rounding (floor to 2 decimals, min 0.1%).

The golden dataset was computed with an independent reference
implementation of the same recursions; the JS engine reproduces it
bit-for-bit because it performs the identical floating-point operations in
the identical order. GitHub Actions runs the suite on every push.

---

## 9. Known unknowns

Points where the final legal/regulatory text can move the numbers:

1. The exact algorithm for the **average yearly asset value** (daily,
   monthly or quarterly readings) — affects volatile portfolios.
2. Whether the fee can be **paid from external funds** rather than from the
   account — materially improves OKI if allowed.
3. The **qualifying-instrument list**, especially for foreign-domiciled
   ETFs.
4. Interaction with **IKE/IKZE** allocation strategy.
5. Mechanics of **transfers between OKI providers** and partial
   withdrawals.

The calculator's disclaimer reflects this: results follow the act as
understood on the build date and are not tax advice.

---

## 10. Sources

- [Ministerstwo Finansów — Osobiste Konta Inwestycyjne](https://www.gov.pl/web/finanse/osobiste-konta-inwestycyjne--nowa-mozliwosc-inwestowania-i-oszczedzania)
- [Bankier.pl — Sejm uchwalił ustawę o OKI](https://www.bankier.pl/smart/sejm-uchwalil-ustawe-o-osobistych-kontach-inwestycyjnych)
- [Bankier.pl — Prezydent podpisał ustawę o OKI](https://www.bankier.pl/wiadomosc/Prezydent-podpisal-ustawe-o-osobistych-kontach-inwestycyjnych-9181877.html)
- [Inwestomat — Jak ma działać OKI](https://inwestomat.eu/jak-ma-dzialac-osobiste-konto-inwestycyjne-oki/)
- [Marcin Iwuć — OKI: zasady, czy warto, wyliczenia](https://marciniwuc.com/oki-osobiste-konto-inwestycyjne-zasady-czy-warto-wyliczenia/)
