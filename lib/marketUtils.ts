// lib/marketUtils.ts

export interface MarketStatus {
  isOpen: boolean;
  session: 'pre-market' | 'regular' | 'after-hours' | 'closed';
  nextOpen: string;
}

export function getMarketStatus(): MarketStatus {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  const day = et.getDay(); // 0=Sun, 6=Sat
  const h = et.getHours();
  const m = et.getMinutes();
  const time = h * 60 + m;

  const isWeekend = day === 0 || day === 6;

  if (isWeekend) {
    return { isOpen: false, session: 'closed', nextOpen: 'Monday 9:30 AM ET' };
  }

  if (time >= 4 * 60 && time < 9 * 60 + 30) {
    return { isOpen: false, session: 'pre-market', nextOpen: '9:30 AM ET' };
  }
  if (time >= 9 * 60 + 30 && time < 16 * 60) {
    return { isOpen: true, session: 'regular', nextOpen: '' };
  }
  if (time >= 16 * 60 && time < 20 * 60) {
    return { isOpen: false, session: 'after-hours', nextOpen: 'Tomorrow 9:30 AM ET' };
  }

  return { isOpen: false, session: 'closed', nextOpen: 'Tomorrow 9:30 AM ET' };
}
