// ---- Playlist. Real song audio is fetched at play time from Apple's free iTunes Search API
// (official 30-second previews + album art). Needs internet. `term` is what we search for.
// Your own full-length MP3s can be added with the "Add songs from my device" button.
const DEMO = (n) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`; // used only if lookup fails
const songs = [
  { title: 'O Rangrez',          artist: 'Shreya Ghoshal, Javed Bashir',   movie: 'Bhaag Milkha Bhaag',      term: 'O Rangrez Bhaag Milkha Bhaag',            fallback: DEMO(1),  color: '#ff7a3d' },
  { title: 'Tujh Mein Rab Dikhta Hai', artist: 'Roop Kumar Rathod',        movie: 'Rab Ne Bana Di Jodi',     term: 'Tujh Mein Rab Dikhta Hai Roop Kumar Rathod', fallback: DEMO(2), color: '#e84393' },
  { title: 'Agar Tum Saath Ho',  artist: 'Alka Yagnik, Arijit Singh',      movie: 'Tamasha',                 term: 'Agar Tum Saath Ho Tamasha',               fallback: DEMO(3),  color: '#6c5ce7' },
  { title: 'Ilahi',              artist: 'Arijit Singh',                   movie: 'Yeh Jawaani Hai Deewani', term: 'Ilahi Yeh Jawaani Hai Deewani',           fallback: DEMO(4),  color: '#00b894' },
  { title: 'Pee Loon',           artist: 'Mohit Chauhan',                  movie: 'Once Upon a Time in Mumbaai', term: 'Pee Loon Mohit Chauhan',              fallback: DEMO(5),  color: '#fdcb6e' },
  { title: 'Tum Se Hi',          artist: 'Mohit Chauhan',                  movie: 'Jab We Met',              term: 'Tum Se Hi Jab We Met',                    fallback: DEMO(6),  color: '#0984e3' },
  { title: 'Kun Faya Kun',       artist: 'A.R. Rahman, Javed Ali, Mohit Chauhan', movie: 'Rockstar',         term: 'Kun Faya Kun Rockstar',                   fallback: DEMO(7),  color: '#d63031' },
  { title: 'Tera Ban Jaunga',    artist: 'Akhil Sachdeva, Tulsi Kumar',    movie: 'Kabir Singh',             term: 'Tera Ban Jaunga Kabir Singh',             fallback: DEMO(8),  color: '#55efc4' },
  { title: 'Zaalima',            artist: 'Arijit Singh, Harshdeep Kaur',   movie: 'Raees',                   term: 'Zaalima Raees Arijit Singh',              fallback: DEMO(9),  color: '#a29bfe' },
  { title: 'Jeene Laga Hoon',    artist: 'Atif Aslam, Shreya Ghoshal',     movie: 'Ramaiya Vastavaiya',      term: 'Jeene Laga Hoon Ramaiya Vastavaiya',      fallback: DEMO(10), color: '#fab1a0' },
];

// ---- Elements
const $ = (id) => document.getElementById(id);
const audio = $('audio'), playBtn = $('play'), progress = $('progress'), volume = $('volume'),
      muteBtn = $('mute'), list = $('list'), art = $('art'), autoplay = $('autoplay'), status = $('status');

let index = 0, loadId = 0, usingFallback = false;
const durations = {}; // index -> seconds

// ---- Helpers
const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
const setFill = (input) => input.style.setProperty('--pct', `${(input.value - input.min) / (input.max - input.min) * 100}%`);
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Look up the official preview clip + cover art for a song
async function getPreview(s) {
  if (s.preview) return s.preview;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(s.term)}&entity=song&country=IN&limit=5`;
  const data = await (await fetch(url)).json();
  const first = s.title.toLowerCase().split(' ')[0];
  const hit = data.results.find((r) => r.previewUrl && r.trackName.toLowerCase().includes(first)) || data.results.find((r) => r.previewUrl);
  if (!hit) throw new Error('No preview found');
  s.preview = hit.previewUrl;
  s.cover = hit.artworkUrl100.replace('100x100', '400x400');
  return s.preview;
}

// ---- Playlist UI
function renderList() {
  list.innerHTML = '';
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = i === index ? 'active' : '';
    li.tabIndex = 0;
    li.innerHTML = `<span class="dot" style="background:${s.color}"></span>
      <div class="info"><div class="name">${esc(s.title)}</div><div class="by">${esc(s.artist)}</div></div>
      <span class="time">${durations[i] ? fmt(durations[i]) : '--:--'}</span>`;
    li.onclick = () => loadSong(i, true);
    li.onkeydown = (e) => { if (e.key === 'Enter') li.onclick(); };
    list.appendChild(li);
  });
}

function paintArt(s) {
  const hole = 'radial-gradient(circle at 50% 50%, #14101f 7%, transparent 8%)';
  art.style.background = s.cover ? `${hole}, url("${s.cover}") center/cover` : `${hole}, ${s.color}`;
}

// ---- Load / play / pause
async function loadSong(i, autoStart = false) {
  index = (i + songs.length) % songs.length; // wraps around
  const s = songs[index], mine = ++loadId;
  audio.pause();
  usingFallback = false;
  $('title').textContent = s.title;
  $('artist').textContent = s.artist;
  $('movie').textContent = s.movie;
  paintArt(s);
  progress.value = 0; setFill(progress);
  $('current').textContent = '0:00';
  $('duration').textContent = durations[index] ? fmt(durations[index]) : '0:00';
  renderList();

  let src;
  if (s.file) src = s.file; // song added from the user's device
  else {
    status.textContent = 'Loading song...';
    try { src = await getPreview(s); status.textContent = '30-second preview'; paintArt(s); }
    catch { src = s.fallback; usingFallback = true; status.textContent = 'Could not fetch this song (check internet). Playing a demo track.'; }
  }
  if (mine !== loadId) return; // user already picked another song
  if (s.file) status.textContent = '';
  audio.src = src;
  if (autoStart) play();
}

function play()  { audio.play().catch(() => {}); }
function pause() { audio.pause(); }
const next = () => loadSong(index + 1, true);
const prev = () => (audio.currentTime > 3 ? (audio.currentTime = 0) : loadSong(index - 1, true));

// ---- Audio events
audio.addEventListener('play',  () => { playBtn.innerHTML = '&#9208;'; playBtn.setAttribute('aria-label', 'Pause'); art.classList.add('spin'); });
audio.addEventListener('pause', () => { playBtn.innerHTML = '&#9654;'; playBtn.setAttribute('aria-label', 'Play');  art.classList.remove('spin'); });
audio.addEventListener('loadedmetadata', () => {
  durations[index] = audio.duration;
  $('duration').textContent = fmt(audio.duration);
  renderList();
});
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  progress.value = (audio.currentTime / audio.duration) * 100;
  setFill(progress);
  $('current').textContent = fmt(audio.currentTime);
});
audio.addEventListener('ended', () => { if (autoplay.checked) next(); }); // autoplay next song
audio.addEventListener('error', () => {
  const s = songs[index];
  if (!usingFallback && s.fallback) {
    usingFallback = true;
    status.textContent = 'This song would not load. Playing a demo track instead.';
    audio.src = s.fallback; play();
  } else status.textContent = 'This song could not be played.';
});

// ---- Controls
playBtn.onclick = () => (audio.paused ? play() : pause());
$('next').onclick = next;
$('prev').onclick = prev;
progress.addEventListener('input', () => {
  if (audio.duration) audio.currentTime = (progress.value / 100) * audio.duration;
  setFill(progress);
});
volume.addEventListener('input', () => {
  audio.volume = volume.value; audio.muted = false;
  muteBtn.innerHTML = audio.volume === 0 ? '&#128263;' : '&#128266;';
  setFill(volume);
});
muteBtn.onclick = () => { audio.muted = !audio.muted; muteBtn.innerHTML = audio.muted ? '&#128263;' : '&#128266;'; };

// ---- Add full-length songs from the user's own device
$('files').addEventListener('change', (e) => {
  const colors = ['#e17055', '#00cec9', '#fd79a8', '#74b9ff'];
  const firstNew = songs.length;
  [...e.target.files].forEach((f, k) => songs.push({
    title: f.name.replace(/\.[^.]+$/, ''), artist: 'My song', movie: 'From your device',
    file: URL.createObjectURL(f), color: colors[k % colors.length] }));
  if (e.target.files.length) loadSong(firstNew, true);
  e.target.value = '';
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
  if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
  if (e.code === 'ArrowRight') next();
  if (e.code === 'ArrowLeft') prev();
});

// ---- Init (browsers block sound until the first click, so the first song waits for Play)
audio.volume = volume.value; setFill(volume);
loadSong(0);