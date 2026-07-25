/* ===== MÚSICA DE FONDO: Background_Music_Player =====
   Módulo independiente de sfx.js: gestiona dos pistas de música en bucle
   (general / combat), su Effective_Volume/Mute_State compartidos y la
   persistencia de la preferencia de audio. No importa nada de sfx.js. */

/* Mapeo Music_Track -> nombre de archivo de audio. Ambos archivos son
   .wav y viven en public/audio/. */
const TRACK_FILES = {
  general: 'music_background_music_medieval.wav',
  combat: 'music_combat.wav',
};

/* Default_Volume_Level: 6% del Base_Volume. */
const DEFAULT_VOLUME = 0.06;

/* Clave de localStorage para el Stored_Audio_Preference, distinta de la
   usada por scoreStore.js. */
const PREF_KEY = 'torre-nubes-audio-pref';

/* Estado interno del módulo (no exportado directamente). */
let tracks = null;           // { general: HTMLAudioElement, combat: HTMLAudioElement } | null
let activeTrackName = null;  // 'general' | 'combat' | null
let effectiveVolume = DEFAULT_VOLUME; // 0..1
let muted = false;
let hasUserInteracted = false;
let pendingScreen = null;    // pantalla objetivo diferida por Autoplay_Restriction
let initialized = false;

/* Los .wav viven en public/audio/ (servidos como estáticos por Vite tanto
   en desarrollo como en build). Duplicada localmente respecto a sfx.js
   para mantener ambos módulos de audio completamente independientes. */
function audioFileUrl(filename) {
  return '/audio/' + filename;
}

/* loadPreference: lee y valida el Stored_Audio_Preference de localStorage.
   Retorna { volume, muted } si es válido, o null si falta cualquier
   condición (JSON inválido, campos ausentes, tipos incorrectos, volume
   fuera de [0, 1]). */
function loadPreference() {
  try {
    const data = localStorage.getItem(PREF_KEY);
    if (!data) return null;

    const pref = JSON.parse(data);
    if (!pref || typeof pref !== 'object') return null;

    const { volume, muted: storedMuted } = pref;
    if (
      typeof volume !== 'number' ||
      !Number.isFinite(volume) ||
      volume < 0 ||
      volume > 1
    ) {
      return null;
    }
    if (typeof storedMuted !== 'boolean') return null;

    return { volume, muted: storedMuted };
  } catch (err) {
    console.error('[music] loadPreference error:', err);
    return null;
  }
}

/* savePreference: serializa y persiste { volume, muted } en localStorage,
   sin relanzar si la escritura falla. */
function savePreference(volume, muted) {
  try {
    const json = JSON.stringify({ volume, muted });
    localStorage.setItem(PREF_KEY, json);
  } catch (err) {
    console.error('[music] savePreference error:', err);
  }
}

/* realVolume: fórmula central que ata Effective_Volume y Mute_State al
   volumen real aplicado a los elementos <audio>. */
function realVolume() {
  return muted ? 0 : effectiveVolume;
}

/* applyVolumeToBothTracks: asigna realVolume() a ambas Music_Track por
   igual (Requirement 2.2), estén o no activas en ese momento. */
function applyVolumeToBothTracks() {
  if (!tracks) return;
  tracks.general.volume = realVolume();
  tracks.combat.volume = realVolume();
}

/* safePlay: envuelve track.play() capturando el rechazo de la Promise sin
   propagar excepción (Requirement 1.9, 7.4). Si el rechazo corresponde a
   una Autoplay_Restriction (NotAllowedError) y aún no hubo interacción del
   usuario, registra la pantalla objetivo en pendingScreen para reintentar
   en notifyUserInteraction() (Requirement 7.1). También captura el evento
   'error' del elemento sin relanzar. */
function safePlay(track) {
  if (!track) return;

  const onError = () => {
    // Fallo de carga/reproducción del Audio_File: no relanzar (Req 1.9).
  };
  track.addEventListener('error', onError, { once: true });

  let playResult;
  try {
    playResult = track.play();
  } catch (err) {
    // Algunos entornos (jsdom antiguo) pueden lanzar de forma síncrona.
    return;
  }

  if (playResult && typeof playResult.catch === 'function') {
    playResult.catch((err) => {
      const isAutoplayRestriction = err && err.name === 'NotAllowedError';
      if (isAutoplayRestriction && !hasUserInteracted) {
        pendingScreen = activeTrackName;
      }
      // Playback_Failure genérico: se ignora sin alterar Effective_Volume/Mute_State.
    });
  }
}

/* pauseTrack: pausa la Music_Track indicada si el elemento existe.
   pause() conserva currentTime de forma nativa. */
function pauseTrack(name) {
  if (!tracks || !name) return;
  const track = tracks[name];
  if (track) {
    track.pause();
  }
}

/* setActiveTrack: pausa síncronamente la pista activa distinta de `name`
   antes de iniciar la nueva (si hasUserInteracted es verdadero) o de
   diferirla vía pendingScreen; actualiza activeTrackName. `name` puede ser
   'general', 'combat' o null (pausa sin elegir nueva pista). */
function setActiveTrack(name) {
  if (!tracks) {
    activeTrackName = name;
    return;
  }

  const alreadyActive = activeTrackName === name;

  if (!alreadyActive && activeTrackName) {
    pauseTrack(activeTrackName);
  }

  if (name !== null) {
    const track = tracks[name];
    if (track) {
      track.volume = realVolume();
      // Idempotencia: si la pista ya es la Active_Track y ya está sonando,
      // no volver a invocar play()/registrar pendingScreen innecesariamente.
      if (alreadyActive && !track.paused) {
        activeTrackName = name;
        return;
      }
      if (hasUserInteracted) {
        safePlay(track);
      } else {
        pendingScreen = name;
      }
    }
  }

  activeTrackName = name;
}

/* ===== API pública: Background_Music_Player ===== */

/* init: detecta soporte de Audio, crea los dos HTMLAudioElement en bucle,
   aplica el Stored_Audio_Preference (o el Default_Volume_Level si no
   existe o es inválido), y aplica el volumen resultante a ambas pistas. */
function init() {
  if (typeof Audio === 'undefined') {
    tracks = null;
    initialized = true;
    return;
  }

  tracks = {
    general: new Audio(audioFileUrl(TRACK_FILES.general)),
    combat: new Audio(audioFileUrl(TRACK_FILES.combat)),
  };
  tracks.general.loop = true;
  tracks.combat.loop = true;
  tracks.general.addEventListener('error', () => {});
  tracks.combat.addEventListener('error', () => {});

  const pref = loadPreference();
  if (pref) {
    effectiveVolume = pref.volume;
    muted = pref.muted;
  } else {
    effectiveVolume = DEFAULT_VOLUME;
    muted = false;
  }

  applyVolumeToBothTracks();
  initialized = true;
}

/* notifyUserInteraction: marca hasUserInteracted = true; si existe una
   pantalla diferida por Autoplay_Restriction (pendingScreen), reintenta
   esa transición y limpia pendingScreen. */
function notifyUserInteraction() {
  hasUserInteracted = true;
  if (pendingScreen !== null) {
    const target = pendingScreen;
    pendingScreen = null;
    setActiveTrack(target);
  }
}

/* enterBuildScreen / enterFallingScreen: alias del mismo comportamiento
   (Requirement 1.2): activan/reanudan la Music_Track 'general'. */
function enterBuildScreen() {
  setActiveTrack('general');
}

function enterFallingScreen() {
  setActiveTrack('general');
}

/* enterBossScreen: pausa 'general' (conserva posición) y activa/reanuda
   'combat'. */
function enterBossScreen() {
  setActiveTrack('combat');
}

/* enterInactiveScreen: pausa la Active_Track vigente sin elegir una nueva
   (usar en start y gameover). */
function enterInactiveScreen() {
  setActiveTrack(null);
}

/* setVolume: actualiza effectiveVolume (0..100 -> 0..1), reaplica el
   volumen a ambas pistas y persiste la preferencia. */
function setVolume(volumePercent) {
  effectiveVolume = volumePercent / 100;
  applyVolumeToBothTracks();
  savePreference(effectiveVolume, muted);
}

/* toggleMute: invierte muted, reaplica el volumen y persiste. */
function toggleMute() {
  muted = !muted;
  applyVolumeToBothTracks();
  savePreference(effectiveVolume, muted);
}

/* getEffectiveVolumePercent: 0..100, para reflejar el Volume_Slider. */
function getEffectiveVolumePercent() {
  return Math.round(effectiveVolume * 100);
}

/* isMuted: boolean, para reflejar el control de mute. */
function isMuted() {
  return muted;
}

export const music = {
  init,
  notifyUserInteraction,
  enterBuildScreen,
  enterFallingScreen,
  enterBossScreen,
  enterInactiveScreen,
  setVolume,
  toggleMute,
  getEffectiveVolumePercent,
  isMuted,
};
