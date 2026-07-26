/* ===== Tests del módulo de efectos de sonido de combate (src/audio/combatSfx.js) ===== */
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { play, loadPreference, savePreference, combatSfx, buildUrl } from './combatSfx.js';

/**
 * expectedUrl(folderId, animName): delega en el `buildUrl` real de
 * src/audio/combatSfx.js (ya exportado por el módulo). Antes reimplementaba
 * localmente la fórmula genérica `{anim}/{anim}.wav`, pero eso ignoraba la
 * tabla FILENAME_OVERRIDES de producción (p. ej. `guerrero/ataque` ->
 * `attack_sword`), haciendo que el modelo de URL de las pruebas se desviara
 * de la ruta real. Al delegar en el `buildUrl` real, el modelo refleja
 * EXACTAMENTE la lógica de producción (incluidos los overrides) y se elimina
 * el riesgo de "drift" entre prueba e implementación.
 */
function expectedUrl(folderId, animName) {
  return buildUrl(folderId, animName);
}

const folderIdArb = fc.oneof(
  fc.constant('guerrero'),
  fc.string({ minLength: 1 }).filter((s) => s !== 'guerrero' && /^[a-zA-Z0-9_]+$/.test(s))
);
const animNameArb = fc.string({ minLength: 1 }).filter((s) => /^[a-zA-Z0-9_]+$/.test(s));

// Feature: combat-animation-sfx, Property 1: Ruta del Character_Voice_Sound derivada sin tabla de mapeo manual
describe('buildUrl (fórmula) — ruta derivada sin tabla de mapeo manual', () => {
  it('Property 1: para cualquier folderId y animName, la URL sigue siempre el patrón /audio/(guerrero|bosses/<folderId>)/<animName>/<animName>.wav, con ambas ocurrencias de animName idénticas', () => {
    fc.assert(
      fc.property(folderIdArb, animNameArb, (folderId, animName) => {
        // Esta propiedad verifica el Sound_Folder_Convention GENÉRICO
        // (`{anim}/{anim}.wav`). La tabla FILENAME_OVERRIDES de producción
        // (p. ej. `guerrero/ataque` -> `attack_sword`) es una excepción
        // documentada y se prueba por separado; se excluye aquí para no
        // contradecir la aserción de "ambas ocurrencias de animName idénticas".
        fc.pre(!(folderId === 'guerrero' && animName === 'ataque'));

        const url = expectedUrl(folderId, animName);

        // La URL siempre respeta el patrón general derivado de una única fórmula,
        // sin ninguna rama especial por bossId o por animName individual.
        const match = url.match(/^\/audio\/(guerrero|bosses\/[^/]+)\/([^/]+)\/([^/]+)\.wav$/);
        expect(match).not.toBeNull();

        // Las dos ocurrencias de <animName> en la URL son siempre idénticas entre sí.
        expect(match[2]).toBe(match[3]);
        expect(match[2]).toBe(animName);

        // Bifurcación binaria exacta según folderId, sin tabla de mapeo por bossId.
        if (folderId === 'guerrero') {
          expect(url.startsWith('/audio/guerrero/')).toBe(true);
        } else {
          expect(url.startsWith(`/audio/bosses/${folderId}/`)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/* ===== Property 2: bucle para idle, reproducción única para animaciones de acción ===== */

/**
 * nextFailureMode: controla cómo se comporta la SIGUIENTE instancia de
 * MockAudio construida (usado por la Property 9, robustez ante fallos de
 * reproducción). Valores posibles:
 *   - null: comportamiento normal (construcción y reproducción exitosas).
 *   - 'constructor': el constructor de MockAudio lanza una excepción.
 *   - 'syncPlay': `.play()` lanza una excepción de forma síncrona.
 *   - 'rejectPromise': `.play()` retorna una Promise rechazada.
 * Se lee y consume (resetea a null) dentro del constructor, de modo que
 * cada valor asignado afecta exactamente a la siguiente construcción de
 * `new Audio(...)`. Las pruebas de Property 2 y Property 3 nunca lo
 * asignan, por lo que permanece en `null` (comportamiento normal) para
 * ellas.
 */
let nextFailureMode = null;

/**
 * MockAudio: mock mínimo de HTMLAudioElement suficiente para que
 * `play(role, folderId, animName)` de combatSfx.js pueda ejecutarse por
 * completo sin un navegador real. Cada instancia registra la URL recibida
 * y expone las propiedades/métodos que combatSfx.js efectivamente usa
 * (`loop`, `volume`, `currentTime`, `paused`, `play()`, `pause()`,
 * `addEventListener()`).
 */
class MockAudio {
  constructor(url) {
    if (nextFailureMode === 'constructor') {
      nextFailureMode = null;
      throw new Error('mock construction failure');
    }
    this.url = url;
    this.loop = false;
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
    // Estas dos banderas se fijan en el momento de la construcción (y no se
    // vuelven a leer de `nextFailureMode` dentro de `play()`) para que el
    // modo de fallo quede atado exactamente a ESTA instancia, sin importar
    // cuándo se invoque su `.play()`.
    this._failPlaySync = nextFailureMode === 'syncPlay';
    this._failPlayAsync = nextFailureMode === 'rejectPromise';
    nextFailureMode = null;
    lastMockAudioInstance = this;
    allMockAudioInstances.push(this);
  }

  play() {
    if (this._failPlaySync) {
      throw new Error('mock sync play failure');
    }
    if (this._failPlayAsync) {
      return Promise.reject(new Error('mock async play failure'));
    }
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener(_type, _listener) { /* no-op */ }
}

// Rastrea la instancia de MockAudio construida más recientemente, actualizada
// por el constructor de MockAudio en cada `new Audio(...)`.
let lastMockAudioInstance = null;

// Rastrea TODAS las instancias de MockAudio construidas durante la ejecución
// actual de una prueba de propiedad (usado por la Property 3 para verificar
// que a lo sumo una instancia por rol permanece "activa" — no pausada — en
// cualquier punto de una secuencia de invocaciones). Cada prueba que la use
// debe reiniciarla (`allMockAudioInstances.length = 0` o reasignarla) al
// comienzo de cada ejecución de fc.property.
let allMockAudioInstances = [];

const roleArb = fc.constantFrom('warrior', 'boss');
const folderIdArb2 = fc.constantFrom('guerrero', 'boss_1_titan_guerrero', 'boss_2_orco');
const actionAnimNameArb = fc.constantFrom(
  'idle', 'ataque', 'ataque_1', 'ataque_2', 'bloqueo', 'herido', 'morir'
);

// Feature: combat-animation-sfx, Property 2: Reproducción en bucle para idle, reproducción única para animaciones de acción
describe('play — bucle para idle, reproducción única para animaciones de acción', () => {
  it('Property 2: tras play(role, folderId, animName) con éxito, el audioElement tiene loop === true si y solo si animName === "idle"', () => {
    vi.stubGlobal('Audio', MockAudio);

    try {
      fc.assert(
        fc.property(roleArb, folderIdArb2, actionAnimNameArb, (role, folderId, animName) => {
          // Fuerza que la entrada activa previa de este `role` (si existe, de una
          // iteración anterior de la propiedad) sea distinta de (folderId, animName),
          // para que la invocación de abajo nunca sea el no-op de "misma animación ya
          // activa" (Requirement 4.4) y siempre construya una nueva instancia mockeada.
          play(role, '__reset__', '__reset__');
          lastMockAudioInstance = null;

          play(role, folderId, animName);

          expect(lastMockAudioInstance).not.toBeNull();
          expect(lastMockAudioInstance.loop).toBe(animName === 'idle');
        }),
        { numRuns: 100 }
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

/* ===== Property 3: ausencia de solapamiento por rol, cambio de boss activo, independencia entre roles ===== */

// Feature: combat-animation-sfx, Property 3: Ausencia de solapamiento por rol, incluyendo cambio de boss activo, e independencia entre roles
describe('play — ausencia de solapamiento por rol, cambio de boss activo, e independencia entre roles', () => {
  it('Property 3: en todo punto de una secuencia de invocaciones existe a lo sumo una entrada activa por rol, una invocación de un rol nunca afecta la entrada del otro rol, y una reinvocación con el mismo folderId/animName es un no-op', () => {
    vi.stubGlobal('Audio', MockAudio);

    try {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              role: roleArb,
              folderId: folderIdArb2,
              animName: actionAnimNameArb,
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (sequence) => {
            // Reinicia el estado del Combat_Sfx_Player al comienzo de cada
            // ejecución de la propiedad, con un folderId/animName "reset" que
            // ninguna combinación generada por folderIdArb2/actionAnimNameArb
            // puede producir, para no heredar entradas activas de una
            // ejecución anterior de fc.property.
            play('warrior', '__reset__', '__reset__');
            play('boss', '__reset__', '__reset__');

            // Reinicia el historial global de instancias mockeadas para esta
            // ejecución de la propiedad (las dos instancias del reset de
            // arriba no deben contarse en el chequeo de "a lo sumo una
            // instancia activa por rol").
            allMockAudioInstances = [];

            // Rastreo local, por rol, de la última instancia de MockAudio
            // creada por una invocación NO no-op de este mismo test (no la
            // usada por el reset de arriba, que se ignora deliberadamente).
            const lastOwnInstance = { warrior: null, boss: null };

            for (const { role, folderId, animName } of sequence) {
              const otherRole = role === 'warrior' ? 'boss' : 'warrior';

              const otherInstance = lastOwnInstance[otherRole];
              const otherPausedBefore = otherInstance ? otherInstance.paused : null;

              const previousInstance = lastOwnInstance[role];
              const isNoop = previousInstance !== null && previousInstance.url === expectedUrl(folderId, animName);

              lastMockAudioInstance = null;
              play(role, folderId, animName);

              if (isNoop) {
                // Requirement 4.4 / 2.1(c): misma animación del mismo rol ya
                // activa -> no se crea una nueva instancia, y la entrada
                // activa existente no se detiene ni se reemplaza.
                expect(lastMockAudioInstance).toBeNull();
                expect(previousInstance.paused).toBe(false);
              } else {
                // Requirement 4.1/4.2: se crea una nueva entrada activa para
                // este rol, y la entrada previa de ESTE MISMO rol (si
                // existía) queda detenida — esto cubre tanto el reemplazo de
                // una animación distinta como el cambio de boss activo
                // (folderId distinto entre invocaciones consecutivas de
                // role === 'boss').
                expect(lastMockAudioInstance).not.toBeNull();
                expect(lastMockAudioInstance.paused).toBe(false);
                if (previousInstance) {
                  expect(previousInstance.paused).toBe(true);
                }
                lastMockAudioInstance._testRole = role;
                lastOwnInstance[role] = lastMockAudioInstance;
              }

              // Requirement 4.3: independencia entre roles — la instancia
              // rastreada del OTRO rol nunca cambia su estado paused como
              // efecto de esta invocación.
              if (otherInstance) {
                expect(otherInstance.paused).toBe(otherPausedBefore);
              }

              // Requirement 4.2: a lo sumo una instancia no pausada por rol,
              // considerando el historial COMPLETO de instancias creadas
              // durante toda la secuencia (no solo la última rastreada).
              for (const r of ['warrior', 'boss']) {
                const activeCount = allMockAudioInstances.filter(
                  (inst) => inst._testRole === r && inst.paused === false
                ).length;
                expect(activeCount).toBeLessThanOrEqual(1);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

/* ===== Property 9: robustez ante fallos de reproducción, sin excepciones y sin efecto cruzado entre personajes ===== */

// Modos de fallo simulados por MockAudio para esta propiedad: sin fallo,
// fallo en la construcción de Audio, fallo síncrono de .play(), o rechazo
// de la Promise devuelta por .play().
const failureModeArb = fc.constantFrom(null, 'constructor', 'syncPlay', 'rejectPromise');

const invocationWithFailureArb = fc.record({
  role: roleArb,
  folderId: folderIdArb2,
  animName: actionAnimNameArb,
  failureMode: failureModeArb,
});

// Feature: combat-animation-sfx, Property 9: Robustez ante fallos de reproducción, sin excepciones y sin efecto cruzado entre personajes
describe('play — robustez ante fallos de reproducción, sin excepciones y sin efecto cruzado entre personajes', () => {
  it('Property 9: ninguna invocación lanza una excepción no controlada, un fallo de un rol nunca altera la entrada del otro rol, y las invocaciones posteriores siguen intentando reproducir con normalidad', async () => {
    // Timeout ampliado: cada ejecución de la propiedad puede contener hasta
    // 20 invocaciones, cada una seguida de un `await setTimeout(..., 0)`
    // real para asentar el manejo de rechazos de Promise, y numRuns: 100
    // repite esto por completo; el timeout por defecto de 5s es insuficiente.
    vi.stubGlobal('Audio', MockAudio);

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.array(invocationWithFailureArb, { minLength: 1, maxLength: 20 }),
          async (sequence) => {
            // Reinicia el estado del Combat_Sfx_Player al comienzo de cada
            // ejecución de la propiedad, con un folderId/animName "reset" que
            // ninguna combinación generada por folderIdArb2/actionAnimNameArb
            // puede producir, para no heredar entradas activas de una
            // ejecución anterior de fc.property.
            nextFailureMode = null;
            play('warrior', '__reset__', '__reset__');
            play('boss', '__reset__', '__reset__');

            // Rastreo local, por rol, de la última instancia de MockAudio
            // efectivamente construida por una invocación de este test (no
            // la usada por el reset de arriba, que se ignora deliberadamente).
            const lastOwnInstance = { warrior: null, boss: null };

            for (let i = 0; i < sequence.length; i += 1) {
              const isLast = i === sequence.length - 1;
              const { role, folderId, animName } = sequence[i];
              // La última invocación de la secuencia siempre se ejecuta sin
              // fallo simulado, para poder verificar que el módulo no quedó
              // "atascado" por un fallo anterior (ver aserción final).
              const failureMode = isLast ? null : sequence[i].failureMode;
              const otherRole = role === 'warrior' ? 'boss' : 'warrior';

              const otherInstanceBefore = lastOwnInstance[otherRole];
              const otherSnapshotBefore = otherInstanceBefore
                ? { paused: otherInstanceBefore.paused, url: otherInstanceBefore.url }
                : null;

              if (isLast) {
                // Fuerza que la entrada activa previa de este `role` (si
                // existe) sea distinta de (folderId, animName), para que la
                // invocación final nunca sea el no-op de "misma animación ya
                // activa" (Requirement 4.4) y siempre construya una nueva
                // instancia mockeada, permitiendo verificar sin ambigüedad
                // que la reproducción normal sigue funcionando.
                nextFailureMode = null;
                play(role, '__reset__', '__reset__');
              }

              lastMockAudioInstance = null;

              // Property 9 (Requirement 11.1): ninguna invocación de play(),
              // sea cual sea el modo de fallo simulado, lanza una excepción
              // no controlada.
              expect(() => {
                nextFailureMode = failureMode;
                play(role, folderId, animName);
              }).not.toThrow();

              // Deja que cualquier manejo de rechazo de Promise a nivel de
              // microtarea (el .catch() adjunto dentro de play()) se asiente
              // antes de continuar, para evitar ruido de "unhandled
              // rejection" en la salida de la prueba (relevante para
              // failureMode === 'rejectPromise').
              // eslint-disable-next-line no-await-in-loop
              await new Promise((resolve) => setTimeout(resolve, 0));

              // Property 9 (Requirement 11.2): la entrada del OTRO rol nunca
              // se ve afectada por una invocación (exitosa o fallida) de
              // este rol.
              if (otherInstanceBefore) {
                expect(otherInstanceBefore.paused).toBe(otherSnapshotBefore.paused);
                expect(otherInstanceBefore.url).toBe(otherSnapshotBefore.url);
              }

              // Si esta invocación efectivamente construyó una instancia
              // (falló únicamente en .play(), o no falló en absoluto),
              // actualiza el rastreo de "última instancia propia" de este
              // rol. Si la construcción misma falló (failureMode ===
              // 'constructor'), no se actualiza: la entrada Map de
              // combatSfx.js para ese rol sigue apuntando a la instancia
              // anterior (ya detenida por stopEntry antes del intento
              // fallido), tal como en la implementación real.
              if (lastMockAudioInstance) {
                lastOwnInstance[role] = lastMockAudioInstance;
              }

              if (isLast) {
                // Property 9 (Requirement 11.4): la invocación final, que
                // siempre tiene failureMode === null, debe haber construido
                // efectivamente una instancia de MockAudio y haber iniciado
                // su reproducción con normalidad — el módulo no quedó
                // permanentemente deshabilitado por ningún fallo anterior en
                // la secuencia.
                expect(lastMockAudioInstance).not.toBeNull();
                expect(lastMockAudioInstance.paused).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    } finally {
      vi.unstubAllGlobals();
      nextFailureMode = null;
    }
  }, 30000);
});

/* ===== Property 7: descarte de preferencias inválidas y aplicación del valor por defecto ===== */

// Generadores de "categorías de corrupción" para el valor almacenado bajo
// PREF_KEY ('torre-nubes-combat-sfx-pref'). Cada categoría produce un valor
// que loadPreference() debe rechazar (retornando null), incluyendo la
// ausencia total de la clave. `fc.oneof` elige aleatoriamente entre ellas.
const invalidStoredValueArb = fc.oneof(
  // JSON malformado: una cadena que no es JSON válido en absoluto.
  fc.string({ minLength: 1 }).filter((s) => {
    try {
      JSON.parse(s);
      return false; // descarta las cadenas que sí resultan ser JSON válido
    } catch (_e) {
      return true;
    }
  }),
  // Objeto válido en JSON pero sin el campo `volume`.
  fc.boolean().map((muted) => JSON.stringify({ muted })),
  // Objeto válido en JSON pero sin el campo `muted`.
  fc.double({ min: 0, max: 1, noNaN: true }).map((volume) => JSON.stringify({ volume })),
  // `volume` no numérico (cadena, booleano, null, objeto, array).
  fc.oneof(
    fc.string(),
    fc.boolean(),
    fc.constant(null),
    fc.constant({}),
    fc.constant([])
  ).map((volume) => JSON.stringify({ volume, muted: false })),
  // `volume` como NaN o Infinity (JSON.stringify los serializa como `null`,
  // así que se construye el objeto directamente para preservar la forma
  // "volume no finito" en la entrada que consume JSON.parse).
  fc.constantFrom(NaN, Infinity, -Infinity).map(
    (volume) => `{"volume":${String(volume)},"muted":false}`
  ),
  // `volume` fuera de [0, 1] (negativo o mayor que 1), numérico y finito.
  fc.oneof(
    fc.double({ min: -1000, max: -0.0001, noNaN: true }),
    fc.double({ min: 1.0001, max: 1000, noNaN: true })
  ).map((volume) => JSON.stringify({ volume, muted: false })),
  // `muted` no booleano (cadena como 'true', o un número).
  fc.double({ min: 0, max: 1, noNaN: true }).chain((volume) =>
    fc.oneof(fc.constantFrom('true', 'false'), fc.integer())
      .map((muted) => JSON.stringify({ volume, muted }))
  ),
  // Ausencia total de la clave: representada aquí con un valor centinela
  // especial que la propiedad interpreta como "no llamar a setItem, y en
  // su lugar remover la clave" antes de invocar loadPreference().
  fc.constant('__ABSENT__')
);

const PREF_KEY = 'torre-nubes-combat-sfx-pref';

// Feature: combat-animation-sfx, Property 7: Descarte de preferencias inválidas y aplicación del valor por defecto
describe('loadPreference — descarte de preferencias inválidas', () => {
  it('Property 7: para cualquier valor corrupto/inválido almacenado bajo torre-nubes-combat-sfx-pref, o la ausencia total de la clave, loadPreference() retorna null (la señal exacta que init() usará para aplicar Combat_Sfx_Default_Volume_Level)', () => {
    // Nota: init() (tarea 1.13, aún no implementada al momento de escribir
    // esta prueba) usará el `null` verificado aquí como señal para aplicar
    // Combat_Sfx_Default_Volume_Level (30%) con Combat_Sfx_Mute_State
    // inactivo. Una vez combatSfx.init() exista, una prueba complementaria
    // podría verificar ese comportamiento de aplicación del valor por
    // defecto a través de la API pública completa; eso queda fuera del
    // alcance de esta tarea (1.12), que solo cubre loadPreference().
    try {
      fc.assert(
        fc.property(invalidStoredValueArb, (rawValue) => {
          if (rawValue === '__ABSENT__') {
            localStorage.removeItem(PREF_KEY);
          } else {
            localStorage.setItem(PREF_KEY, rawValue);
          }

          expect(loadPreference()).toBeNull();
        }),
        { numRuns: 100 }
      );
    } finally {
      localStorage.removeItem(PREF_KEY);
    }
  });
});

/* ===== Property 6: round-trip de persistencia de preferencias válidas ===== */

// Nota: el design.md describe la Property 6 en términos de (re)inicializar
// el módulo vía `combatSfx.init()` tras guardar la preferencia. `init()`
// todavía no existe en combatSfx.js (tarea 1.13, posterior a esta). Como
// `loadPreference`/`savePreference` ya existen (tarea 1.10), esta prueba
// valida el round-trip directamente sobre esas dos funciones, que es
// exactamente la capa de persistencia que `init()` invocará internamente
// una vez implementado. Una vez `combatSfx.init()` / `getEffectiveVolumePercent()`
// / `isMuted()` existan, una prueba complementaria podría ejercer este mismo
// round-trip a través de la API pública; eso queda fuera del alcance de esta
// tarea (1.11).

// Feature: combat-animation-sfx, Property 6: Round-trip de persistencia de preferencias válidas
describe('savePreference/loadPreference — round-trip de persistencia de preferencias válidas', () => {
  it('Property 6: para cualquier volumePercent en [0, 100] y muted en {true, false}, savePreference(volume, muted) seguido de loadPreference() retorna esos mismos valores', () => {
    try {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.boolean(),
          (volumePercent, muted) => {
            const volume = volumePercent / 100;

            savePreference(volume, muted);
            const result = loadPreference();

            expect(result).not.toBeNull();
            expect(Math.abs(result.volume - volume) < 1e-9).toBe(true);
            expect(result.muted).toBe(muted);
          }
        ),
        { numRuns: 100 }
      );
    } finally {
      localStorage.removeItem(PREF_KEY);
    }
  });
});


/* ===== Property 5: volumen real consistente aplicado a todo Active_Character_Sound ===== */

// Feature: combat-animation-sfx, Property 5: Volumen real consistente aplicado a todo Active_Character_Sound
describe('combatSfx.setVolume/toggleMute — volumen real consistente aplicado a todo Active_Character_Sound', () => {
  it('Property 5: para cualquier Combat_Sfx_Effective_Volume en [0, 100] y Combat_Sfx_Mute_State, el .volume de cada audioElement activo (warrior y boss) es igual a volumePercent/100 * (muted ? 0 : 1), sin alterar paused/currentTime/loop', () => {
    vi.stubGlobal('Audio', MockAudio);

    try {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.boolean(),
          (volumePercent, mutedTarget) => {
            // Reinicia la preferencia persistida y reinicializa el módulo para
            // arrancar cada ejecución de la propiedad desde una base conocida
            // (Combat_Sfx_Default_Volume_Level, muted = false), sin heredar
            // estado de una ejecución anterior de fc.property ni de otras
            // pruebas de este mismo archivo.
            localStorage.removeItem(PREF_KEY);
            combatSfx.init();

            // Limpia cualquier Active_Character_Sound heredado de una
            // ejecución anterior, con un folderId/animName "reset" que las
            // invocaciones de abajo nunca podrían generar por sí mismas.
            play('warrior', '__reset__', '__reset__');
            play('boss', '__reset__', '__reset__');

            // Crea una entrada activa para cada rol a través de la API
            // pública. combatSfx.play es exactamente la misma referencia de
            // función que el `play` importado arriba.
            lastMockAudioInstance = null;
            combatSfx.play('warrior', 'guerrero', 'idle');
            const warriorInstance = lastMockAudioInstance;
            expect(warriorInstance).not.toBeNull();

            lastMockAudioInstance = null;
            combatSfx.play('boss', 'boss_1_titan_guerrero', 'idle');
            const bossInstance = lastMockAudioInstance;
            expect(bossInstance).not.toBeNull();

            const instances = [warriorInstance, bossInstance];
            const snapshotBefore = instances.map((inst) => ({
              paused: inst.paused,
              currentTime: inst.currentTime,
              loop: inst.loop,
            }));

            // Aplica el Combat_Sfx_Effective_Volume generado, y lleva
            // Combat_Sfx_Mute_State al valor objetivo generado. Como
            // combatSfx no expone un setter directo de muted, se lee el
            // estado actual vía isMuted() y solo se invoca toggleMute() si
            // es necesario para alcanzar mutedTarget.
            combatSfx.setVolume(volumePercent);
            if (combatSfx.isMuted() !== mutedTarget) {
              combatSfx.toggleMute();
            }

            const expectedVolume = (volumePercent / 100) * (mutedTarget ? 0 : 1);

            instances.forEach((inst, idx) => {
              expect(Math.abs(inst.volume - expectedVolume) < 1e-9).toBe(true);
              // El cambio de volumen/mute no debe alterar paused, currentTime
              // ni loop de ningún audioElement activo.
              expect(inst.paused).toBe(snapshotBefore[idx].paused);
              expect(inst.currentTime).toBe(snapshotBefore[idx].currentTime);
              expect(inst.loop).toBe(snapshotBefore[idx].loop);
            });
          }
        ),
        { numRuns: 100 }
      );
    } finally {
      vi.unstubAllGlobals();
      localStorage.removeItem(PREF_KEY);
    }
  });
});

/* ===== Pruebas unitarias del módulo combatSfx.js (tarea 1.15) ===== */
// Validates: Requirements 1.3, 1.4, 7.1, 7.2

describe('buildUrl — casos concretos', () => {
  it('buildUrl("guerrero", "idle") produce /audio/guerrero/idle/idle.wav', () => {
    expect(buildUrl('guerrero', 'idle')).toBe('/audio/guerrero/idle/idle.wav');
  });

  it('buildUrl("boss_1_titan_guerrero", "ataque_1") produce la ruta correspondiente', () => {
    expect(buildUrl('boss_1_titan_guerrero', 'ataque_1')).toBe(
      '/audio/bosses/boss_1_titan_guerrero/ataque_1/ataque_1.wav'
    );
  });

  it('buildUrl("boss_1_titan_guerrero", "ataque_2") produce la ruta correspondiente', () => {
    expect(buildUrl('boss_1_titan_guerrero', 'ataque_2')).toBe(
      '/audio/bosses/boss_1_titan_guerrero/ataque_2/ataque_2.wav'
    );
  });

  const otherBossIds = ['boss_2_orco', 'boss_3_tigre', 'boss_4_golem', 'boss_5_brujo'];

  it.each(otherBossIds)('buildUrl("%s", "ataque") produce la ruta correspondiente', (bossId) => {
    expect(buildUrl(bossId, 'ataque')).toBe(`/audio/bosses/${bossId}/ataque/ataque.wav`);
  });
});

describe('combatSfx.init — sin preferencia previa aplica el valor por defecto', () => {
  it('sin Combat_Sfx_Stored_Preference previo, init() aplica 30% de volumen y Combat_Sfx_Mute_State inactivo', () => {
    localStorage.removeItem(PREF_KEY);

    combatSfx.init();

    expect(combatSfx.getEffectiveVolumePercent()).toBe(30);
    expect(combatSfx.isMuted()).toBe(false);
  });
});
