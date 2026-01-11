
import React from 'react';
import { ShiftType, ShiftInfo } from './types';

export const SHIFTS: ShiftInfo[] = [
  {
    type: ShiftType.SHIFT_1,
    label: 'I',
    timeRange: '09:00\n18:00',
    color: '#e6ccb9',
  },
  {
    type: ShiftType.SHIFT_2,
    label: 'II',
    timeRange: '14:00\n22:00',
    color: '#b7d8d4',
  },
  {
    type: ShiftType.SHIFT_3,
    label: 'III',
    timeRange: '18:00\n02:00',
    color: '#7e9f9c',
  },
  {
    type: ShiftType.HOLIDAY,
    label: 'выходной',
    timeRange: '',
    color: '#fca5a5',
  },
  {
    type: ShiftType.EXTRA,
    label: '',
    timeRange: '',
    color: '#cbd5e1',
    icon: '🌴' // Palm tree icon for the last row
  }
];

export const WEEK_DAYS = [
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
  'воскресенье'
];

export const HEADER_COLORS = {
  weekday: '#4c6467',
  weekend: '#dc2626'
};

export const WEEKEND_CELL_BG = '#fee2e2';
export const WEEKEND_CELL_OVERLAY = 'rgba(220, 38, 38, 0.05)';
