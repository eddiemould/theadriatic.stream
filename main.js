const radioStream = document.getElementById('radio-stream');
const volumeSlider = document.getElementById('volume-slider');
const playButton = document.getElementById('play-button');
const muteButton = document.getElementById('mute-button');
const offlineMessage = document.getElementById('offline-message');
const online = document.getElementsByClassName('online');

// Station offline message
function showOffline() {
  radioStream.pause();
  radioStream.removeAttribute("src");
  radioStream.load();
  isPlaying = false;
  playButton.textContent = "▶";
  for (const all of online) all.hidden = true;
  offlineMessage.hidden = false;
}

// All visible when online
function showOnline() {
  for (const all of online) all.hidden = false;
  offlineMessage.hidden = true;
}

// Radio stream in memory
const streamUrl = radioStream.dataset.src;

// Mute button and volume slider
let lastVolume = parseFloat(volumeSlider.value) || 0.8;
let isMuted = radioStream.volume === 0;

function updateMuteButton() {
  muteButton.textContent = isMuted ? "Unmute" : "Mute";
  muteButton.classList.toggle('is-active', isMuted);
}

function setVolume(value) {
  radioStream.volume = value;
  volumeSlider.value = value;
}

// Volume slider and muting at 0
volumeSlider.addEventListener('input', () => {
  const value = parseFloat(volumeSlider.value);
  radioStream.volume = value;

  if (value === 0) {
    isMuted = true;
    lastVolume = 0.8;
  } else {
    isMuted = false;
    lastVolume = value;
  }
  updateMuteButton();
});

// Mute toggle function
function toggleMute() {
  if (isMuted) {
    setVolume(lastVolume || 0.8);
    isMuted = false;
  } else {
    lastVolume = parseFloat(volumeSlider.value) || 0.8;
    setVolume(0);
    isMuted = true;
  }
  updateMuteButton();
}

// Mute button
muteButton.addEventListener('click', () => {
  toggleMute();
  muteButton.blur(); // stops Space/Enter re-triggering the focused button
});

// Lowercase "m" key shortcut
window.addEventListener('keydown', (event) => {
  if (event.repeat) return;

  const tag = event.target.tagName;
  const isTyping = tag === 'TEXTAREA' || (tag === 'INPUT' && event.target.type !== 'range');
  if (isTyping) return;

  if (event.key === 'm') {
    toggleMute();
  }
});

// Initial state
radioStream.volume = parseFloat(volumeSlider.value);
updateMuteButton();

let isPlaying = !radioStream.paused;

// Play / pause function
function togglePlay() {
  if (isPlaying) {
    // Pausing drops the stream with no buffering
    playButton.textContent = "Play";
    radioStream.pause();
    radioStream.removeAttribute('src');
    radioStream.load();
    isPlaying = false;
  } else {
    // Resuming joins stream live
    radioStream.src = streamUrl;
    radioStream.load();
    radioStream.play()
      .then(() => {
        playButton.textContent = "Pause";
        isPlaying = true;
      })
      .catch(error => {
        console.error(error);
        playButton.textContent = "Play";
        isPlaying = false;
      });
  }
}

// Clicking button to play and pause
playButton.addEventListener('click', togglePlay);
radioStream.addEventListener('playing', () => playButton.classList.add('is-active'));
radioStream.addEventListener('emptied', () => playButton.classList.remove('is-active'));

// Spacebar to play and pause
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault(); // stops the page from scrolling
    togglePlay();
  }
});

// Previously played songs

  function timeAgo(unixSeconds) {
  const diff = Math.floor(Date.now() / 1000 - unixSeconds);
  if (diff < 60) return "Just played";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return mins + (mins === 1 ? " min ago" : " mins ago");
  const hrs = Math.floor(mins / 60);
  return hrs + (hrs === 1 ? " hour ago" : " hours ago");
}

const FALLBACK_ART = ""; // album art image default

function renderHistory(history, nowStart) {
  const items = history || [];

  for (let i = 0; i < 4; i++) {
    const box = document.getElementById('history-' + (i + 1));
    if (!box) continue;

    const song = items[i] && items[i].song;

    box.hidden = !song;
    if (!song) continue;

    const art = box.querySelector('.history-art');
    const newArt = song.art || FALLBACK_ART;
    if (art.getAttribute('src') !== newArt) art.src = newArt;

    box.querySelector('.history-title').textContent = song.title;
    box.querySelector('.history-artist').textContent = song.artist;

    // Time ago from when the next song started
    const finishedAt = (i === 0 ? nowStart : items[i - 1].played_at)
      || (items[i].played_at + items[i].duration);

    box.querySelector('.history-time').textContent = timeAgo(finishedAt);
  }
}

// song title and artist ticker
const ticker = document.getElementById('title-description');
const track = document.getElementById('ticker-track');
const group = track.querySelector('.ticker-group');
let lastTickerText = '';

function buildTicker() {
  track.querySelectorAll('.ticker-clone').forEach(c => c.remove());

  const groupWidth = group.offsetWidth;
  if (!groupWidth) return;

  // enough copies for the window width
  const total = Math.ceil(ticker.clientWidth / groupWidth) + 1;

  for (let i = 1; i < total; i++) {
    const clone = group.cloneNode(true);
    clone.classList.add('ticker-clone');
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    track.appendChild(clone);
  }

  track.style.setProperty('--group-width', groupWidth + 'px');
}

// measure when font loaded
document.fonts.ready.then(buildTicker);     

// Now playing data from station & offline message
let failures = 0;
let hasLoaded = false;
function updateNowPlaying() {
  fetch("https://radio.theadriatic.stream/api/nowplaying/adriatic", {
  cache: 'no-store',
  signal: AbortSignal.timeout(5000)
})
    .then(response => {
      if (!response.ok) throw new Error("Error fetching resource");
      return response.json();
    })
    .then(data => {
      failures = 0;
      hasLoaded = true;
      if (!data.is_online) {
        showOffline();
        return;
      }
        showOnline();

        const songInfo = data.now_playing.song;
        document.getElementById("song-title").textContent = songInfo.title;
        document.getElementById("song-artist").textContent = songInfo.artist;
        // load ticker when song changes
        const tickerText = songInfo.title + '|' + songInfo.artist;
          if (tickerText !== lastTickerText) {
            lastTickerText = tickerText;
            buildTicker();
          }
        document.getElementById("song-art").src = songInfo.art || FALLBACK_ART;
        renderHistory(data.song_history, data.now_playing.played_at);
      })
      .catch(error => {
        failures++;
        if (!hasLoaded || failures >= 3) {
          document.getElementById("song-title").textContent = "Unavailable";
          showOffline();
        }
      });
}

// Refresh now playing data on load, then every 15s
updateNowPlaying();
setInterval(updateNowPlaying, 15000);

// current time (UK)
const clockDisplay = document.getElementById('current-time');
const ukClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

function updateClock() {
  clockDisplay.textContent = ukClock.format(new Date());
  setTimeout(updateClock, 1000 - (Date.now() % 1000)); // seconds
}

updateClock();

(() => {
  'use strict';

  /* Defaults */

  const BASE = 'https://radio.theadriatic.stream';
  const STATION_ID = 3;
  const TIMEZONE = 'Europe/London';
  const LOCALE = 'en-GB';

  // Default descriptions for repeating playlists
  const DESCRIPTIONS = {
    'General Rotation': 'Default off-schedule rotation.',
    'ADRIATIC FEVER': 'A mix of city pop and sunny songs.',
    'AFTER HOURS': 'Sleepy songs for sleepy people.',
    'CLASSICAL': 'A mix of classical music.',
    'DAILY MIX': "The Adriatic's main mix.",
    'ELECTRONIC': 'A mix of electronic music.',
    'FOLK': 'A mix of folk music.',
    'JAZZ': 'A mix of jazz music.',
    'NEW RELEASES': 'Updated frequently!',
    'SOUL + GOSPEL': 'A mix of soul and gospel music.',
    'SOUNDTRACK + SCORE': 'A mix of Film, TV & Game music.',
    'Live: Eddie': 'Live show with Eddie.'
  };

  // Default data if nothing is scheduled 
  const DEFAULT_WEEK = {
    monday: [{ time: '00:00 – 00:00', title: 'General Rotation' }], 
    tuesday: [{ time: '00:00 – 00:00', title: 'General Rotation' }], 
    wednesday: [{ time: '00:00 – 00:00', title: 'General Rotation' }], 
    thursday: [{ time: '00:00 – 00:00', title: 'General Rotation' }],
    friday: [{ time: '00:00 – 00:00', title: 'General Rotation' }], 
    saturday: [{ time: '00:00 – 00:00', title: 'General Rotation' }], 
    sunday: [{ time: '00:00 – 00:00', title: 'General Rotation' }]
  };

  /* More defaults */

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const container = document.getElementById('current-schedule');
  const currentProgram = document.getElementById('current-program');
  const template = document.getElementById('slot-template');
  if (!container || !template) return;

  // Lowercase and uppercase match
  const norm = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

  const descriptions = {};
  Object.keys(DESCRIPTIONS).forEach(k => { descriptions[norm(k)] = DESCRIPTIONS[k]; });

  // Elements from API
  function make(tag, text, className) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (className) e.className = className;
    return e;
  }

  /* Timing settings */

  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  });

  const clock = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit'
  });

  function addDays(key, n) {
    const d = new Date(key + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function weekKeys(now) {
    const today = dateKey.format(now);
    const dow = new Date(today + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
    const monday = addDays(today, -((dow + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }

  /* API data */

  let state = { weekStart: '', keys: [], items: [] };

  // Current date to API URL
  async function load() {
    const keys = weekKeys(new Date());
    const url = `${BASE}/api/station/${STATION_ID}/schedule?start=${keys[0]}&end=${keys[6]}`;
    let items = [];

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const rows = await res.json();

      // Organising data
      items = rows
        .map(x => ({
          title: x.title || x.name,
          start: x.start_timestamp,
          end: x.end_timestamp,
          key: dateKey.format(new Date(x.start_timestamp * 1000))
        }))
        .filter(x => keys.includes(x.key))
        .sort((a, b) => a.start - b.start);
    } catch (err) {
      console.error(err);
      if (state.weekStart === keys[0]) return;
    }

    state = { weekStart: keys[0], keys, items };
    render();
  }

  /* Render data */

  function render() {
    currentProgram.textContent = '';
    const nowSec = Date.now() / 1000;
    const today = dateKey.format(new Date());

    DAYS.forEach((day, i) => {
      const dayBox = document.getElementById(day + '-data');
      if (!dayBox) return;
      const key = state.keys[i];

      dayBox.classList.toggle('is-today', key === today);
      dayBox.querySelectorAll('.slot').forEach(s => s.remove());

      // Data from API
      let slots = state.items.filter(x => x.key === key).map(x => ({
        title: x.title,
        time: `${clock.format(new Date(x.start * 1000))} – ${clock.format(new Date(x.end * 1000))}`,
        description: descriptions[norm(x.title)] || '',
        isNow: x.start <= nowSec && nowSec < x.end,
        isDefault: false
      }));

      // Use DEFAULT_WEEK if API returned nothing for a day
      if (!slots.length) {
        slots = (DEFAULT_WEEK[day] || []).map(x => ({
          title: x.title || '',
          time: x.time || '',
          description: x.description || descriptions[norm(x.title)] || '',
          isNow: key === today,
          isDefault: true
        }));
      }

      slots.forEach(s => {
        const slot = template.content.firstElementChild.cloneNode(true);
        slot.querySelector('.slot-title').textContent = s.title;
        slot.querySelector('.slot-timing').textContent = s.time;

        const desc = slot.querySelector('.slot-description');
        if (s.description) desc.textContent = s.description;
        else desc.remove();

        slot.classList.toggle('is-now', s.isNow);
        slot.classList.toggle('is-default', s.isDefault);
        if (s.isNow) currentProgram.textContent = s.title;
        dayBox.appendChild(slot);
      });
    });
  }

  /* Updating */

  // Refetch for new week
  setInterval(() => {
    if (weekKeys(new Date())[0] !== state.weekStart) load();
    else render();
  }, 60 * 1000);

  // Refresh edits made in Azuracast
  setInterval(load, 30 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });

  load();
})();