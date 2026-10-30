import type { StripAlarm, StripValue } from '@onigam/lab-kit/ui';
import { months, num, t, type UiKey } from '../i18n/ui';
import { dayOfMonth, monthOf } from '../sim/site';
import type { AlarmKey, MillState } from '../sim/types';
import type { MillSim } from '../sim/engine';

// What the bottom strip of the frame shows: four live values, the date of the clock, the alarms.

const ALARM_KEYS: Record<AlarmKey, { key: UiKey; severe: boolean }> = {
  lowWater: { key: 'alarmLowWater', severe: false },
  flood: { key: 'alarmFlood', severe: true },
  gateClosed: { key: 'alarmGateClosed', severe: false },
  tooFast: { key: 'alarmTooFast', severe: true },
  tooSlow: { key: 'alarmTooSlow', severe: false },
  noCharge: { key: 'alarmNoCharge', severe: true },
  rackClogged: { key: 'alarmRack', severe: false },
  outOfRange: { key: 'alarmRange', severe: false },
};

export function stripValues(sim: MillSim): StripValue[] {
  const s = sim.state;
  const flow = s.flow * 1000;
  return [
    { label: t('stripPower'), value: num(s.electricPower), unit: 'W', cls: 'live--water' },
    { label: t('stripSpeed'), value: num(s.rpm), unit: t('unitRpm') },
    { label: t('stripFlow'), value: num(flow, flow < 10 ? 1 : 0), unit: 'L/s' },
    { label: t('stripEfficiency'), value: num(100 * s.etaOverall), unit: '%' },
  ];
}

/** "12 Oct" and the time of the day (the clock starts on 1 October at 12:00). */
export function stripClock(sim: MillSim): { time: string; sub: string } {
  return clockOf(sim.state);
}

export function clockOf(s: MillState): { time: string; sub: string } {
  const hh = Math.floor(s.hour);
  const mm = Math.floor((s.hour - hh) * 60);
  return {
    time: `${dayOfMonth(s.day)} ${months()[monthOf(s.day)]}`,
    sub: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
  };
}

export function stripAlarms(sim: MillSim): StripAlarm[] {
  return sim.state.alarms.map((a) => ({ key: a, label: t(ALARM_KEYS[a].key), severe: ALARM_KEYS[a].severe }));
}

export const STRIP_SPEEDS = [1, 3600, 86400, 604800];
