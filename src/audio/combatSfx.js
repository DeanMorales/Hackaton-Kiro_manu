/* ===== EFECTOS DE SONIDO DE COMBATE: Combat_Sfx_Player =====
   Módulo independiente de music.js y de sfx.js: sincroniza la reproducción
   de Character_Voice_Sound con el inicio de cada Sprite_Animation del
   Warrior_Sprite y del Boss_Sprite activo durante un Boss_Fight. No
   importa nada de music.js ni de sfx.js, no comparte estado ni volumen
   con ninguno de los dos, y tiene su propia clave de localStorage. */

/* Combat_Sfx_Default_Volume_Level: 30% del Base_Volume. */
const DEFAULT_VOLUME = 0.30;

/* Clave de localStorage para el Combat_Sfx_Stored_Preference, distinta de
   la usada por el Stored_Audio_Preference de música. */
const PREF_KEY = 'torre-nubes-combat-sfx-pref';

/* Estado interno del módulo (no exportado directamente). */
let activeSounds = new Map(); // 'warrior' | 'boss' -> { folderId, animName, audioElement }
let effectiveVolume = DEFAULT_VOLUME; // 0..1
let muted = false;

/* realVolume: fórmula central que ata Combat_Sfx_Effective_Volume y
   Combat_Sfx_Mute_State al volumen real aplicado a los audioElement. */
function realVolume() {
  return muted ? 0 : effectiveVolume;
}

/**
 * buildUrl(folderId, animName): resuelve la ruta del Character_Voice_Sound
 * siguiendo el Sound_Folder_Convention, sin tabla de mapeo manual
 * (Requirement 1.3, 1.4). `folderId` es 'guerrero' para el Warrior_Sprite,
 * o el `id` de un BOSS_ROSTER entry (p. ej. 'boss_1_titan_guerrero') para
 * el Boss_Sprite activo.
 */
function buildUrl(folderId, animName) {
  const base = folderId === 'guerrero' ? 'guerrero' : `bosses/${folderId}`;
  return `/audio/${base}/${animName}/${animName}.wav`;
}

/**
 * stopEntry(entry): detiene una entrada previa de forma segura, sin
 * propagar excepciones si el elemento ya falló o fue descartado
 * (Requirement 11.3).
 */
function stopEntry(entry) {
  if (!entry) return;
  try {
    entry.audioElement.pause();
    entry.audioElement.currentTime = 0;
  } catch (_e) { /* swallow: elemento ya inválido o sin soporte de seek */ }
}

/**
 * play(role, folderId, animName): núcleo del Combat_Sfx_Player, invocado
 * de forma síncrona por los wrappers de main.js (Requirement 1.1, 1.2).
 * `role` es 'warrior' o 'boss'.
 */
function play(role, folderId, animName) {
  const current = activeSounds.get(role);
  if (current && current.folderId === folderId && current.animName === animName) {
    return; // Requirement 4.4 / 2.1(c): misma animación del mismo personaje ya activa, no-op
  }
  stopEntry(current); // Requirement 4.1, 4.2: detiene el Active_Character_Sound anterior del mismo rol

  if (typeof Audio === 'undefined') return; // Requirement 11: navegador sin soporte de Audio

  let audioElement;
  try {
    audioElement = new Audio(buildUrl(folderId, animName));
    audioElement.loop = animName === 'idle'; // Requirement 2 vs Requirement 3
    audioElement.volume = realVolume();
    audioElement.addEventListener('error', () => { /* swallow: Requirement 11.1 */ });
  } catch (_e) {
    return; // fallo de construcción: Requirement 11.1, sin registrar Active_Character_Sound
  }

  activeSounds.set(role, { folderId, animName, audioElement });

  try {
    const playPromise = audioElement.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => { /* swallow: Requirement 11.1, sin fallback sintetizado */ });
    }
  } catch (_e) { /* swallow: fallo síncrono de .play(), Requirement 11.1 */ }
}

/**
 * applyVolumeToActiveSounds(): asigna realVolume() a cada audioElement
 * activo, sin pausar ni reiniciar su reproducción (Requirement 9.1, 9.2, 9.3).
 */
function applyVolumeToActiveSounds() {
  activeSounds.forEach((entry) => {
    entry.audioElement.volume = realVolume();
  });
}

/**
 * loadPreference: lee y valida el Combat_Sfx_Stored_Preference de
 * localStorage. Retorna { volume, muted } si es válido, o null si falta
 * cualquier condición (JSON inválido, campos ausentes, tipos incorrectos,
 * volume fuera de [0, 1]).
 */
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
    console.error('[combatSfx] loadPreference error:', err);
    return null;
  }
}

/**
 * savePreference: serializa y persiste { volume, muted } en localStorage,
 * sin relanzar si la escritura falla (Requirement 8.2).
 */
function savePreference(volume, muted) {
  try {
    const json = JSON.stringify({ volume, muted });
    localStorage.setItem(PREF_KEY, json);
  } catch (err) {
    console.error('[combatSfx] savePreference error:', err);
  }
}

/**
 * init: carga el Combat_Sfx_Stored_Preference (o aplica
 * Combat_Sfx_Default_Volume_Level si no existe o es inválido). No crea ni
 * precarga ningún HTMLAudioElement — cada Character_Voice_Sound se crea de
 * forma perezosa en cada play(...).
 */
function init() {
  const pref = loadPreference();
  if (pref) {
    effectiveVolume = pref.volume;
    muted = pref.muted;
  } else {
    effectiveVolume = DEFAULT_VOLUME;
    muted = false;
  }
}

/**
 * setVolume: actualiza effectiveVolume (0..100 -> 0..1), reaplica el
 * volumen a los Active_Character_Sound existentes y persiste.
 */
function setVolume(volumePercent) {
  effectiveVolume = volumePercent / 100;
  applyVolumeToActiveSounds();
  savePreference(effectiveVolume, muted);
}

/**
 * toggleMute: invierte muted, reaplica el volumen y persiste.
 */
function toggleMute() {
  muted = !muted;
  applyVolumeToActiveSounds();
  savePreference(effectiveVolume, muted);
}

/** getEffectiveVolumePercent: 0..100, para reflejar el Combat_Sfx_Volume_Slider. */
function getEffectiveVolumePercent() {
  return Math.round(effectiveVolume * 100);
}

/** isMuted: boolean, para reflejar el control de mute. */
function isMuted() {
  return muted;
}

export const combatSfx = {
  init,
  play,
  setVolume,
  toggleMute,
  getEffectiveVolumePercent,
  isMuted,
};

export { buildUrl, stopEntry, play, applyVolumeToActiveSounds, realVolume, loadPreference, savePreference };
