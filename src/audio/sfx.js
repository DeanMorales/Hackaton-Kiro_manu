/* ===== AUDIO: síntesis de efectos con Web Audio API ===== */
let actx=null;
function beep(freq, dur, type, gain){
  try{
    if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type=type||'sine'; o.frequency.value=freq;
    g.gain.value = gain||0.06;
    o.connect(g); g.connect(actx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+dur);
    o.stop(actx.currentTime+dur+0.02);
  }catch(e){}
}
/* Mapeo Sound_Event -> nombre de archivo de audio.
   'win' no tiene entrada: siempre usa el Synthesizer.
   'correct' tampoco tiene entrada: el feedback inmediato de acierto
   (Requirement 12) usa el Synthesizer. El sonido de espada del guerrero
   ya no se dispara desde aquí: el Combat_Sfx_Player (src/audio/combatSfx.js)
   es el único mecanismo que reproduce el sonido de la Animation_Sequence
   'ataque' del Warrior_Sprite (ver src/main.js). */
const AUDIO_MAP = {
  place: 'Blocks.wav',
  door: 'door-open.wav',
  fall: 'drop.wav',
  lose: 'drop.wav',
  wrong: 'incorrect.wav',
  flipCard: 'flip_card.wav',
  jump: 'jump.wav',
};

/* Implementaciones del Synthesizer (fallback), con los mismos parámetros
   de oscilador que la implementación original de sfx.js. */
const SYNTH_FALLBACK = {
  place:()=>beep(220,0.08,'square',0.05),
  fall:()=>beep(110,0.5,'sawtooth',0.07),
  correct:()=>{beep(660,0.09,'triangle',0.07); setTimeout(()=>beep(880,0.12,'triangle',0.07),90);},
  wrong:()=>beep(140,0.28,'sawtooth',0.08),
  win:()=>{beep(523,0.12,'triangle',0.08); setTimeout(()=>beep(659,0.12,'triangle',0.08),110); setTimeout(()=>beep(784,0.2,'triangle',0.08),220);},
  lose:()=>{beep(200,0.2,'sawtooth',0.08); setTimeout(()=>beep(150,0.3,'sawtooth',0.08),150);},
  door:()=>{beep(392,0.15,'triangle',0.06); setTimeout(()=>beep(494,0.18,'triangle',0.06),120);},
  flipCard:()=>beep(300,0.05,'square',0.04),
  jump:()=>beep(440,0.07,'square',0.05),
};

/* Registro de eventos que sufrieron un Playback_Failure: una vez agregado
   un evento aquí, usa el Synthesizer de forma permanente durante la sesión. */
const failedEvents = new Set();

/* Precarga de los Audio_File referenciados en AUDIO_MAP.
   PRELOADED: Map<filename, HTMLAudioElement> — usado como plantilla para
   cloneNode() en cada reproducción. La precarga es de "mejor esfuerzo":
   un fallo de carga aquí nunca lanza excepción durante la inicialización
   del módulo; el primer intento de reproducción de ese archivo detectará
   el fallo y activará el fallback normal. */
const PRELOADED = new Map();

/* Los .wav viven en public/audio/ (servidos como estáticos por Vite tanto
   en desarrollo como en build) para que la ruta sea estable en ambos
   entornos sin depender de resolución de módulos por import.meta.url. */
function audioFileUrl(filename){
  return '/audio/' + filename;
}

(function preloadAudioFiles(){
  if (typeof Audio === 'undefined') return;
  const uniqueFiles = new Set(Object.values(AUDIO_MAP));
  uniqueFiles.forEach((filename) => {
    try{
      const audio = new Audio(audioFileUrl(filename));
      audio.preload = 'auto';
      audio.addEventListener('error', () => {});
      PRELOADED.set(filename, audio);
    }catch(e){}
  });
})();

/* playAudioFile(file): intenta reproducir el Audio_File precargado
   correspondiente a `file` (nombre de archivo, clave de PRELOADED).
   Retorna una Promise que:
   - resuelve cuando la reproducción se inicia sin error detectable
   - se rechaza con un Playback_Failure cuando:
     - el navegador no soporta Audio (`typeof Audio === 'undefined'`)
     - la Promise de `.play()` es rechazada
     - el clon del elemento emite un evento `error`
   Ningún error se propaga como excepción síncrona: toda la lógica está
   envuelta en manejo de errores. */
function playAudioFile(file){
  return new Promise((resolve, reject) => {
    try{
      if (typeof Audio === 'undefined') {
        reject(new Error('Playback_Failure: Audio not supported'));
        return;
      }

      const template = PRELOADED.get(file);
      const clone = template ? template.cloneNode() : new Audio(audioFileUrl(file));

      const onError = () => {
        cleanup();
        reject(new Error('Playback_Failure: element error event'));
      };

      const cleanup = () => {
        try{ clone.removeEventListener('error', onError); }catch(e){}
      };

      clone.addEventListener('error', onError);

      const playResult = clone.play();

      if (playResult && typeof playResult.then === 'function') {
        playResult.then(
          () => { cleanup(); resolve(); },
          (err) => { cleanup(); reject(err instanceof Error ? err : new Error('Playback_Failure: play() rejected')); }
        );
      } else {
        // Navegadores antiguos sin Promise en .play(): asumir éxito síncrono.
        cleanup();
        resolve();
      }
    }catch(e){
      reject(e instanceof Error ? e : new Error('Playback_Failure: unexpected error'));
    }
  });
}

/* dispatch(eventName): punto único de resolución de reproducción para un
   Sound_Event. Es síncrona desde la perspectiva del llamador: nunca retorna
   una Promise ni requiere await, y nunca lanza una excepción no controlada.
   - Si el evento ya sufrió un Playback_Failure previo (está en failedEvents),
     usa el Synthesizer directamente.
   - Si el evento no tiene Audio_File asociado (caso 'win'), usa el
     Synthesizer directamente.
   - En otro caso, dispara playAudioFile() y, si esa Promise se rechaza
     (Playback_Failure), marca el evento en failedEvents y usa el
     Synthesizer como respaldo. */
function dispatch(eventName){
  try{
    if (failedEvents.has(eventName)) {
      try{ SYNTH_FALLBACK[eventName](); }catch(e){}
      return;
    }

    const file = AUDIO_MAP[eventName];
    if (!file) {
      try{ SYNTH_FALLBACK[eventName](); }catch(e){}
      return;
    }

    try{
      const playPromise = playAudioFile(file);
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          failedEvents.add(eventName);
          try{ SYNTH_FALLBACK[eventName](); }catch(e){}
        });
      }
    }catch(e){
      failedEvents.add(eventName);
      try{ SYNTH_FALLBACK[eventName](); }catch(e2){}
    }
  }catch(e){
    // Nunca propagar excepciones al llamador de sfx.*
  }
}

export const sfx = {
  place:()=>dispatch('place'),
  fall:()=>dispatch('fall'),
  correct:()=>dispatch('correct'),
  wrong:()=>dispatch('wrong'),
  win:()=>dispatch('win'),
  lose:()=>dispatch('lose'),
  door:()=>dispatch('door'),
  flipCard:()=>dispatch('flipCard'),
  jump:()=>dispatch('jump'),
};
