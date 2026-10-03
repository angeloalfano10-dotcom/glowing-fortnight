// Service contracts. The app talks only to these four interfaces.
// Today they are backed by mocks (device.mock.js, calendar.mock.js) plus the free
// Open-Meteo API (weather.openmeteo.js) and localStorage (storage.local.js).
// A native app swaps the implementations in services/index.js and nothing else:
//   DeviceService   → CoreBluetooth (BLE GATT) for pairing and Wi-Fi provisioning,
//                     then Wi-Fi for settings and night estimates. NOCTIS syncs its
//                     own briefing over Wi-Fi; nothing is sent from the phone.
//   CalendarService → EventKit (Apple Calendar) and Google OAuth through a small backend.
//   WeatherService  → can stay on Open-Meteo.
//   StorageService  → UserDefaults / Keychain.
// This file is documentation only; it exports nothing at runtime.

/**
 * @typedef {'idle'|'clock'|'sleep'|'alarm'|'briefing'|'voice'|'off'} DeviceMode
 *
 * @typedef {Object} FoundDevice
 * @property {string} id
 * @property {string} name          Advertised name, "NOCTIS".
 * @property {number} rssi
 *
 * @typedef {Object} DeviceStatus
 * @property {boolean} paired
 * @property {boolean} connected
 * @property {DeviceMode} mode      What the screen is showing right now.
 * @property {string|null} firmware
 * @property {string|null} wifi     SSID it is joined to.
 *
 * @typedef {Object} Network
 * @property {string} ssid
 * @property {boolean} secure
 * @property {1|2|3} signal
 *
 * @typedef {Object} Alarm
 * @property {string} id
 * @property {number} h
 * @property {number} m
 * @property {boolean} on
 * @property {number[]} days          0 = Sunday … 6 = Saturday
 * @property {{light:boolean,sound:boolean,pulse:boolean}} wake
 * @property {number} lead            Minutes the light starts rising before the alarm.
 * @property {'dawn'|'chime'|'birdsong'} tone
 *
 * @typedef {Object} DeviceConfig     Everything the phone pushes to NOCTIS.
 * @property {string} [name]
 * @property {string} [finish]
 * @property {'white'|'warm'} [theme]
 * @property {'eyes'|'clock'} [face]  What NOCTIS shows at rest.
 * @property {boolean} [dimWithRoom]
 * @property {Alarm[]} [alarms]
 * @property {{remind:boolean, lead:number}} [bedtime]   Wind-down reminder before bed-by.
 * @property {number} [brightness]    0–1
 * @property {boolean} [clock24]
 * @property {boolean} [autoUpdate]   Overnight, never close to an alarm.
 * @property {{on:boolean,volume:number,speak:boolean}} [sound]
 * @property {{roomSensing:boolean,recordings:boolean,voice:boolean}} [privacy]
 *
 * @typedef {Object} Briefing         What NOCTIS shows and says in the morning. NOCTIS syncs it
 *                                    itself over Wi-Fi; the app builds the same one to mirror it.
 * @property {string} forDate         YYYY-MM-DD of the morning.
 * @property {string} wakeAt          "07:00"
 * @property {string} greeting        "Good morning."
 * @property {string} dateLine        "Monday 5 October"
 * @property {{temp:number,high:number,low:number,text:string,place:string,source:'live'|'sample'}} weather
 * @property {{title:string,start:string,startMin:number,inMin:number,beforeAlarm:boolean}|null} event
 * @property {string} speech          Plain text for TTS (device or cloud).
 * @property {number} builtAt
 *
 * @typedef {Object} NightEstimate    Estimates from room sensing. Never a measurement.
 *   Times are "night minutes": minutes since the evening's midnight (23:40 = 1420, 07:10 = 1870).
 * @property {string} date            YYYY-MM-DD of the morning.
 * @property {number} dow             Weekday of the morning (0 = Sunday).
 * @property {number|null} alarm      Alarm minute that morning, null for a free morning.
 * @property {number} asleep          Estimated time of falling asleep.
 * @property {number} wake            Estimated time of waking.
 * @property {number} sleepMin        Estimated time asleep.
 * @property {number} restlessMin     Estimated restless minutes.
 * @property {number} snoringMin      Estimated snoring.
 * @property {{start:number,end:number}[]} spells           Snoring spells.
 * @property {{t:number,restless:boolean,snore:boolean}[]} buckets   10-minute steps through the night.
 * @property {{t:number,v:number}[]} temps                   Room temperature every 15 min, °C.
 * @property {number} roomTemp        °C, average overnight.
 * @property {number} tempMin
 * @property {number} tempMax
 * @property {number} humidity        %, average overnight.
 * @property {'Dark'|'Dim'|'Bright'} light
 *
 * @typedef {Object} Room             The bedroom right now.
 * @property {number} temp
 * @property {number} humidity
 * @property {'Dark'|'Dim'|'Bright'} light
 *
 * @typedef {Object} UpdateInfo
 * @property {boolean} available
 * @property {string} version
 * @property {string[]} [notes]
 *
 * @typedef {Object} DeviceService
 * @property {() => DeviceStatus} status
 * @property {() => Promise<FoundDevice>} scan                 BLE scan for a nearby NOCTIS.
 * @property {(id:string, onStep?:(s:string)=>void) => Promise<DeviceStatus>} pair
 * @property {() => Promise<Network[]>} wifiNetworks           Scanned by NOCTIS (2.4 GHz only).
 * @property {(ssid:string, password?:string) => Promise<void>} joinWifi   Rejects with code 'wrong-password'.
 * @property {(patch:DeviceConfig) => Promise<void>} configure
 * @property {(count:number, now:Date) => Promise<NightEstimate[]>} nights   Newest first.
 * @property {() => Promise<Room>} room
 * @property {() => Promise<void>} deleteSleepData        Removes every estimate and saved clip.
 * @property {() => Promise<UpdateInfo>} checkUpdate
 * @property {(onProgress:(p:number)=>void) => Promise<{version:string}>} installUpdate
 * @property {() => Promise<void>} unpair
 * @property {(type:'status'|'mode', fn:(s:DeviceStatus)=>void) => () => void} on
 *
 * @typedef {Object} CalendarProvider
 * @property {'apple'|'google'} id
 * @property {string} name
 *
 * @typedef {Object} CalendarAccount
 * @property {string} account
 * @property {{id:string,name:string,on:boolean}[]} calendars
 *
 * @typedef {Object} CalendarEvent
 * @property {string} title
 * @property {number} startMin        Minutes after midnight.
 * @property {string} calendar
 * @property {'apple'|'google'} provider
 *
 * @typedef {Object} CalendarService
 * @property {() => CalendarProvider[]} providers
 * @property {() => Record<string, CalendarAccount|null>} accounts
 * @property {(id:string) => Promise<CalendarAccount>} connect      OAuth / EventKit permission.
 * @property {(id:string) => Promise<void>} disconnect
 * @property {(id:string, calId:string, on:boolean) => void} setCalendar
 * @property {(date:Date) => Promise<CalendarEvent|null>} firstEvent   First timed event that day.
 *
 * @typedef {Object} Place
 * @property {string} name
 * @property {string} [region]
 * @property {number} lat
 * @property {number} lon
 *
 * @typedef {Object} MorningWeather
 * @property {number} temp            At wake time.
 * @property {number} high
 * @property {number} low
 * @property {number} code            WMO weather code.
 * @property {string} text            "Sunny"
 * @property {'live'|'sample'} source
 *
 * @typedef {Object} WeatherService
 * @property {(place:Place, morning:Date) => Promise<MorningWeather>} morning
 * @property {(query:string) => Promise<Place[]>} search
 * @property {() => Promise<Place>} guess        From the phone's time zone, no permission needed.
 * @property {() => Promise<Place>} locate       Uses the location permission.
 *
 * @typedef {Object} StorageService
 * @property {(key:string, fallback?:any) => any} get
 * @property {(key:string, value:any) => void} set
 * @property {(key:string) => void} remove
 * @property {() => void} clear
 */

export {};
