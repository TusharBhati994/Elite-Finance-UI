export type OHLCV = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type LinePoint = { time: number; value: number };

export function calcEMA(data: OHLCV[], period: number): LinePoint[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const emaData: LinePoint[] = [];
  let ema = data[0].close;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      emaData.push({ time: data[i].time, value: ema });
    } else {
      ema = data[i].close * k + ema * (1 - k);
      emaData.push({ time: data[i].time, value: ema });
    }
  }

  return emaData;
}

export function calcVWAP(data: OHLCV[]): LinePoint[] {
  if (data.length === 0) return [];
  const vwapData: LinePoint[] = [];

  let cumVol = 0;
  let cumVolPrice = 0;
  let currentDay = new Date(data[0].time * 1000).getUTCDate();

  for (let i = 0; i < data.length; i++) {
    const pointDate = new Date(data[i].time * 1000).getUTCDate();
    if (pointDate !== currentDay) {
      cumVol = 0;
      cumVolPrice = 0;
      currentDay = pointDate;
    }

    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    const vol = data[i].volume || 0;
    cumVol += vol;
    cumVolPrice += typicalPrice * vol;

    vwapData.push({
      time: data[i].time,
      value: cumVol === 0 ? typicalPrice : cumVolPrice / cumVol,
    });
  }

  return vwapData;
}

export function calcBollingerBands(
  data: OHLCV[],
  period: number
): { upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] } {
  if (data.length === 0) return { upper: [], middle: [], lower: [] };
  const upper: LinePoint[] = [];
  const middle: LinePoint[] = [];
  const lower: LinePoint[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val.close, 0);
    const sma = sum / period;

    const variance = slice.reduce((acc, val) => acc + Math.pow(val.close - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    middle.push({ time: data[i].time, value: sma });
    upper.push({ time: data[i].time, value: sma + stdDev * 2 });
    lower.push({ time: data[i].time, value: sma - stdDev * 2 });
  }

  return { upper, middle, lower };
}

export function calcRSI(data: OHLCV[], period: number): LinePoint[] {
  if (data.length < period + 1) return [];
  const rsiData: LinePoint[] = [];

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);

  rsiData.push({ time: data[period].time, value: rsi });

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    let gain = 0, loss = 0;
    if (change > 0) gain = change;
    else loss = -change;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);
    rsiData.push({ time: data[i].time, value: rsi });
  }

  return rsiData;
}

export function calcMACD(data: OHLCV[]): {
  macd: LinePoint[];
  signal: LinePoint[];
  histogram: { time: number; value: number; color: string }[];
} {
  const shortPeriod = 12;
  const longPeriod = 26;
  const signalPeriod = 9;

  const shortEma = calcEMA(data, shortPeriod);
  const longEma = calcEMA(data, longPeriod);

  const macdLine: LinePoint[] = [];

  // Align short and long EMA
  const longEmaMap = new Map(longEma.map((p) => [p.time, p.value]));
  
  for (const p of shortEma) {
    if (longEmaMap.has(p.time)) {
      macdLine.push({
        time: p.time,
        value: p.value - longEmaMap.get(p.time)!,
      });
    }
  }

  // Calculate signal line (EMA of MACD line)
  // We need to convert MACD line to a format calcEMA can use
  const macdOHLCV: OHLCV[] = macdLine.map((p) => ({
    time: p.time,
    open: p.value,
    high: p.value,
    low: p.value,
    close: p.value,
  }));

  const signalLine = calcEMA(macdOHLCV, signalPeriod);
  const signalMap = new Map(signalLine.map((p) => [p.time, p.value]));

  const histogram: { time: number; value: number; color: string }[] = [];

  for (let i = 0; i < macdLine.length; i++) {
    const p = macdLine[i];
    if (signalMap.has(p.time)) {
      const sigVal = signalMap.get(p.time)!;
      const histVal = p.value - sigVal;
      
      let color = "#10b981"; // emerald
      if (histVal < 0) {
        color = "#f43f5e"; // rose
      }
      
      if (i > 0 && signalMap.has(macdLine[i-1].time)) {
        const prevHistVal = macdLine[i-1].value - signalMap.get(macdLine[i-1].time)!;
        if (histVal >= 0 && histVal < prevHistVal) {
           color = "#34d399"; // slightly lighter emerald for decreasing positive
        } else if (histVal < 0 && histVal < prevHistVal) {
           color = "#f43f5e"; // rose for increasing negative
        } else if (histVal < 0 && histVal > prevHistVal) {
           color = "#fb7185"; // slightly lighter rose for decreasing negative
        }
      }

      histogram.push({
        time: p.time,
        value: histVal,
        color,
      });
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}
