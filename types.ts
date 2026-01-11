
export enum ShiftType {
  SHIFT_1 = 'I',
  SHIFT_2 = 'II',
  SHIFT_3 = 'III',
  HOLIDAY = 'OFF',
  EXTRA = 'EXTRA'
}

export interface ShiftInfo {
  type: ShiftType;
  label: string;
  timeRange: string;
  color: string;
  icon?: string; // Optional icon for the shift column
}

export interface Employee {
  id: string;
  name: string;
  avatarUrl: string;
  scale: number;
  position: { x: number; y: number };
}

export interface ScheduleCell {
  date: string; // ISO string
  shiftType: ShiftType;
  employees: Employee[];
}

export type ScheduleData = Record<string, Employee[]>; // key: "YYYY-MM-DD_SHIFT_TYPE"
