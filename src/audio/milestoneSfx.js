/* ===== AUDIO: Milestone Celebration Sound Player ===== */

// Rutas a los archivos de audio de celebración
const EPIC_SOUND_FILE = 'sonidosUI/epic_ congratulations_30.mp3';
const MILESTONE_SOUND_FILE = 'sonidosUI/every_10_floors.mp3';

const CELEBRATION_BOOST_KEY = 'torre-nubes-celebration-boost';
const DEFAULT_BOOST = 1.5;

/**
 * Selecciona el tipo de sonido a reproducir según el número de piso.
 *
 * @param {number} n - Número de piso alcanzado (Floor_Number)
 * @returns {'epic' | 'milestone' | 'none'}
 *   - 'epic'      si n % 30 === 0
 *   - 'milestone' si n % 15 === 0 && n % 30 !== 0
 *   - 'none'      en cualquier otro caso
 */
export function selectMilestoneSound(n) {
  if (n % 30 === 0) return 'epic';
  if (n % 15 === 0) return 'milestone';
  return 'none';
}

/**
 * Calcula el volumen efectivo a aplicar al HTMLAudioElement.
 *
 * @param {number} volumePercent - Nivel de volumen del jugador en el rango [0, 100]
 * @param {boolean} muted - true si el audio está silenciado
 * @returns {number} Volumen en el rango [0, 1] listo para asignar a HTMLAudioElement.volume
 */
export function computeEffectiveVolume(volumePercent, muted) {
  return muted ? 0 : volumePercent / 100;
}

/* ===== PRELOADED: precarga de los archivos MP3 de celebración =====
   Sigue el mismo patrón IIFE de sfx.js: new Audio() con preload='auto',
   listener de error silencioso, envuelto en try/catch, y toda la
   inicialización dentro de una IIFE guardada por typeof Audio check. */
export const PRELOADED = new Map();

try {
  if (typeof Audio !== 'undefined') {
    (function preloadMilestoneAudioFiles() {
      const files = [
        'epic_ congratulations_30.mp3',
        'every_10_floors.mp3',
      ];
      files.forEach((filename) => {
        try {
          const audio = new Audio(`/audio/sonidosUI/${filename}`);
          audio.preload = 'auto';
          audio.addEventListener('error', () => {});
          PRELOADED.set(filename, audio);
        } catch (e) {}
      });
    })();
  }
} catch (e) {}

/* Estado interno del módulo */
let _getVolCtx = null;
let _boostMultiplier = DEFAULT_BOOST;

/**
 * Lee el boost de celebración desde localStorage.
 * @returns {number|null} El valor guardado si es válido en [1.0, 3.0], o null si inválido/ausente.
 */
function loadBoostPreference() {
  try {
    const raw = localStorage.getItem(CELEBRATION_BOOST_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 1.0 || value > 3.0) return null;
    return value;
  } catch (e) {
    console.error('[milestoneSfx] Error al leer boost de localStorage:', e);
    return null;
  }
}

/**
 * Guarda el boost de celebración en localStorage.
 * @param {number} v
 */
function saveBoostPreference(v) {
  try {
    localStorage.setItem(CELEBRATION_BOOST_KEY, String(v));
  } catch (e) {
    console.error('[milestoneSfx] Error al guardar boost en localStorage:', e);
  }
}

/**
 * milestoneSfx: objeto público del Milestone_Sound_Player.
 *
 * init(getVolCtx): recibe un callback que devuelve { volume: number (0–1), muted: boolean }
 *   y lo almacena para usarlo en playMilestoneAudio.
 *
 * playMilestoneAudio(floorNumber): selecciona y reproduce el sonido correcto
 *   según el piso alcanzado, respetando el volumen/mute configurado.
 */
export const milestoneSfx = {
  /**
   * Almacena el callback de contexto de volumen.
   * @param {() => { volume: number, muted: boolean }} getVolCtx
   */
  init(getVolCtx) {
    _getVolCtx = getVolCtx;
    const saved = loadBoostPreference();
    if (saved !== null) _boostMultiplier = saved;
  },

  /**
   * Reproduce el sonido de hito correspondiente al piso alcanzado.
   * Retorna sin hacer nada si no corresponde ningún sonido (selectMilestoneSound === 'none').
   * Todos los errores de carga/reproducción van a console.error y nunca se propagan.
   * @param {number} floorNumber
   */
  playMilestoneAudio(floorNumber) {
    try {
      const soundType = selectMilestoneSound(floorNumber);
      if (soundType === 'none') return;

      const filename =
        soundType === 'epic'
          ? 'epic_ congratulations_30.mp3'
          : 'every_10_floors.mp3';

      // Obtener contexto de volumen; fallback a volumen neutro
      let volCtx = { volume: 1, muted: false };
      try {
        if (typeof _getVolCtx === 'function') {
          volCtx = _getVolCtx();
        }
      } catch (e) {
        console.error('[milestoneSfx] Error al obtener contexto de volumen:', e);
      }

      // Apply boost multiplier; clamp to [0, 1]; mute overrides all
      const boostedVolume = Math.min(1, volCtx.volume * _boostMultiplier);
      const effectiveVolume = volCtx.muted ? 0 : boostedVolume;

      if (typeof Audio === 'undefined') return;

      let audioEl;
      try {
        const template = PRELOADED.get(filename);
        audioEl = template ? template.cloneNode() : new Audio(`/audio/sonidosUI/${filename}`);
        audioEl.volume = effectiveVolume;
      } catch (e) {
        console.error('[milestoneSfx] Error al crear elemento de audio:', e);
        return;
      }

      try {
        const playPromise = audioEl.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            console.error('[milestoneSfx] Error al reproducir audio de hito:', err);
          });
        }
      } catch (e) {
        console.error('[milestoneSfx] Error síncrono al llamar .play():', e);
      }
    } catch (e) {
      console.error('[milestoneSfx] Error inesperado en playMilestoneAudio:', e);
    }
  },

  /**
   * Establece el multiplicador de volumen para el audio de celebración.
   * Solo acepta valores en el rango [1.0, 3.0].
   * @param {number} v
   */
  setBoost(v) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 1.0 && v <= 3.0) {
      _boostMultiplier = v;
      saveBoostPreference(v);
    }
  },

  /**
   * Retorna el multiplicador de volumen actual.
   * @returns {number}
   */
  getBoost() {
    return _boostMultiplier;
  },
};
