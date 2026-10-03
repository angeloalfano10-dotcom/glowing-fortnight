// WeatherService on the free Open-Meteo API (no key, no account, no tracking).
// Only coordinates are sent. If the network fails, a clearly labelled sample is used.

import { storage } from './storage.local.js';
import { dayKey, pad } from '../lib/time.js';

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const TTL = 30 * 60 * 1000;

export const FALLBACK_PLACE = { name: 'Limassol', region: 'Cyprus', lat: 34.68, lon: 33.04 };

const PLACES = [
  FALLBACK_PLACE,
  { name: 'Nicosia', region: 'Cyprus', lat: 35.17, lon: 33.36 },
  { name: 'London', region: 'United Kingdom', lat: 51.51, lon: -0.13 },
  { name: 'Amsterdam', region: 'Netherlands', lat: 52.37, lon: 4.9 },
  { name: 'Berlin', region: 'Germany', lat: 52.52, lon: 13.4 },
  { name: 'Athens', region: 'Greece', lat: 37.98, lon: 23.73 },
  { name: 'New York', region: 'United States', lat: 40.71, lon: -74.01 },
];

export function codeText(c) {
  if (c === 0) return 'Sunny';
  if (c === 1) return 'Mostly sunny';
  if (c === 2) return 'Partly cloudy';
  if (c === 3) return 'Cloudy';
  if (c === 45 || c === 48) return 'Fog';
  if (c >= 51 && c <= 57) return 'Drizzle';
  if (c >= 61 && c <= 67) return 'Rain';
  if (c >= 71 && c <= 77) return 'Snow';
  if (c >= 80 && c <= 82) return 'Showers';
  if (c === 85 || c === 86) return 'Snow showers';
  if (c >= 95) return 'Thunderstorms';
  return 'Mixed';
}

async function getJSON(url, ms = 6000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function sample(morning) {
  const month = morning.getMonth();
  const high = [16, 17, 19, 22, 26, 30, 33, 33, 30, 26, 21, 17][month];
  const codes = [0, 0, 1, 2, 0, 3, 1];
  const code = codes[morning.getDate() % codes.length];
  return { temp: high - 7, high, low: high - 9, code, text: codeText(code), source: 'sample' };
}

/** @returns {import('./contracts.js').WeatherService & { forceSample:boolean }} */
export function createWeather() {
  const api = {
    forceSample: storage.get('mock.weatherSample', false),

    async morning(place, morning) {
      if (api.forceSample || !place) return sample(morning);
      try {
        const key = `weather:${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
        let cached = storage.get(key);
        if (!cached || Date.now() - cached.at > TTL) {
          const q = new URLSearchParams({
            latitude: place.lat, longitude: place.lon, timezone: 'auto', forecast_days: '3',
            hourly: 'temperature_2m,weather_code',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min',
          });
          const data = await getJSON(`${FORECAST}?${q}`);
          cached = { at: Date.now(), data };
          storage.set(key, cached);
        }
        const { daily, hourly } = cached.data;
        const day = dayKey(morning);
        const di = daily.time.indexOf(day);
        if (di < 0) return sample(morning);
        const hi = hourly.time.indexOf(`${day}T${pad(morning.getHours())}:00`);
        const code = daily.weather_code[di];
        return {
          temp: Math.round(hi >= 0 ? hourly.temperature_2m[hi] : daily.temperature_2m_min[di]),
          high: Math.round(daily.temperature_2m_max[di]),
          low: Math.round(daily.temperature_2m_min[di]),
          code,
          text: codeText(code),
          source: 'live',
        };
      } catch {
        return sample(morning);
      }
    },

    async search(query) {
      const q = query.trim();
      if (!q) return [];
      try {
        const p = new URLSearchParams({ name: q, count: '6', language: 'en', format: 'json' });
        const data = await getJSON(`${GEOCODE}?${p}`);
        return (data.results || []).map((r) => ({
          name: r.name,
          region: [r.admin1, r.country].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(', '),
          lat: r.latitude,
          lon: r.longitude,
        }));
      } catch {
        const l = q.toLowerCase();
        return PLACES.filter((p) => p.name.toLowerCase().startsWith(l));
      }
    },

    async guess() {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const city = tz.split('/').pop().replace(/_/g, ' ');
        if (city && city !== 'UTC') {
          const found = await api.search(city);
          if (found[0]) return { ...found[0], auto: true };
        }
      } catch { /* fall through */ }
      return { ...FALLBACK_PLACE, auto: true };
    },

    locate() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('unavailable')); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ name: 'Current location', region: '', lat: pos.coords.latitude, lon: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600e3 },
        );
      });
    },

    setForceSample(v) { api.forceSample = v; storage.set('mock.weatherSample', v); },
  };
  return api;
}
