// Service wiring. This is the only file that knows which implementations are used.
// To go native: replace createMockDevice / createMockCalendar with BLE and OAuth
// backed versions that satisfy the same contracts (see contracts.js).

import { storage } from './storage.local.js';
import { createMockDevice } from './device.mock.js';
import { createMockCalendar } from './calendar.mock.js';
import { createWeather } from './weather.openmeteo.js';

export const services = {
  storage,
  device: createMockDevice(),
  calendar: createMockCalendar(),
  weather: createWeather(),
};
