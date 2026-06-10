---
name: yahoo-finance2 v3 instantiation
description: yahoo-finance2 v3 requires class instantiation, not default import usage
---

In yahoo-finance2 v3 (currently installed), you must instantiate the class before calling methods:

```typescript
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
const result = await yahooFinance.chart(symbol, { period1, period2, interval });
```

**Why:** v3 changed from a singleton module pattern to a class-based pattern. Using the default import directly (as in v2) throws: "Call `const yahooFinance = new YahooFinance()` first."

**How to apply:** Any new route or service using yahoo-finance2 must instantiate `new YahooFinance()` before calling `.chart()`, `.quoteSummary()`, etc.
