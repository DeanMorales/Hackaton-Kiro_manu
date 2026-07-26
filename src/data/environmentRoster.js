/**
 * Biome_Catalog / Time_Of_Day_Catalog: catálogos estáticos de los 5 Biome y
 * los 4 Time_Of_Day disponibles, y las reglas de selección/rotación
 * (Biome_Rotation, Time_Of_Day_Rotation) que determinan el Active_Biome y el
 * Active_Time_Of_Day de cada Game_Session, siguiendo el mismo patrón
 * fijo-luego-aleatorio que `selectBoss` (src/data/bossRoster.js).
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

export const BIOME_CATALOG = [
  {
    id: 'tundra', displayName: 'Tundra',
    hillColor: '#7f97ad',
    groundColors: ['#eef4f7', '#b9c7cf'],   // [claro, oscuro] de la banda de suelo
    vegetationCue: 'none',                   // Requirement 2.3 / 8.1: nieve, sin vegetación
  },
  {
    id: 'sabana', displayName: 'Sabana',
    hillColor: '#9c8a4e',
    groundColors: ['#d9b968', '#a9822f'],
    vegetationCue: 'dryGrassTufts',          // Requirement 2.4 / 8.2
  },
  {
    id: 'desierto', displayName: 'Desierto',
    hillColor: '#b98a55',
    groundColors: ['#e3c48a', '#c79a54'],
    vegetationCue: 'none',                   // Requirement 2.5 / 8.3: explícitamente sin vegetación
  },
  {
    id: 'bosque_templado', displayName: 'Bosque Templado',
    hillColor: '#3f6b3f',
    groundColors: ['#5fa050', '#356b34'],
    vegetationCue: 'bushes',                 // Requirement 2.6 / 8.4
  },
  {
    id: 'taiga', displayName: 'Taiga',
    hillColor: '#2f4f4f',
    groundColors: ['#4a6b5a', '#2c4a3a'],
    vegetationCue: 'conifers',                // Requirement 2.7 / 8.5, distinto de 'bushes'
  },
];

/**
 * Time_Of_Day_Catalog: catálogo estático de los 4 Time_Of_Day disponibles.
 * Los valores de `skyGradientStops`/`cloudColor` de 'noche' son idénticos a
 * los que `drawSky` usa hoy de forma fija, para evitar una regresión visual
 * en la primera sesión que rote a Noche.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export const TIME_OF_DAY_CATALOG = [
  {
    id: 'manana', displayName: 'Mañana',
    skyGradientStops: [[0, '#ffd9a0'], [0.5, '#ffb37a'], [1, '#8fb6d9']],
    starVisibility: false,
    cloudColor: 'rgba(255,255,255,.22)',
    sunMoonCue: { type: 'sun', color: '#fff2c2', xRatio: 0.2, yRatio: 0.18, radius: 34 },
  },
  {
    id: 'dia', displayName: 'Día',
    skyGradientStops: [[0, '#8fd0ff'], [0.6, '#bfe6ff'], [1, '#eaf6ff']],
    starVisibility: false,
    cloudColor: 'rgba(255,255,255,.35)',
    sunMoonCue: { type: 'sun', color: '#fff9e0', xRatio: 0.5, yRatio: 0.1, radius: 40 },
  },
  {
    id: 'tarde', displayName: 'Tarde',
    skyGradientStops: [[0, '#3b2d54'], [0.5, '#c1573f'], [1, '#f2a65a']],
    starVisibility: false,
    cloudColor: 'rgba(255,220,200,.18)',
    sunMoonCue: { type: 'sun', color: '#ffb066', xRatio: 0.78, yRatio: 0.22, radius: 36 },
  },
  {
    id: 'noche', displayName: 'Noche',
    skyGradientStops: [[0, '#050716'], [0.55, '#111a3d'], [1, '#2c3d6e']],
    starVisibility: true,
    cloudColor: 'rgba(200,210,235,.10)',
    sunMoonCue: { type: 'moon', color: '#eef3ff', xRatio: 0.82, yRatio: 0.15, radius: 22 },
  },
];

/**
 * Selecciona el Active_Biome para una Game_Session, replicando exactamente
 * el patrón fijo-luego-aleatorio de `selectBoss` (src/data/bossRoster.js)
 * sobre BIOME_CATALOG. Función pura: mismo `sessionsStarted`, mismo
 * comportamiento (determinista para sessionsStarted < BIOME_CATALOG.length).
 *
 * - Para las primeras 5 Game_Session (sessionsStarted en [0,4]), devuelve
 *   siempre la entrada en ese índice fijo.
 * - A partir de la 6ta Game_Session (sessionsStarted >= 5), devuelve una
 *   entrada aleatoria del catálogo, permitiendo repeticiones.
 *
 * @param {number} sessionsStarted - Game_Session ya iniciadas antes de esta
 *   selección (equivalente al `bossesResolved` de `selectBoss`, pero para
 *   bioma).
 * @returns {typeof BIOME_CATALOG[number]}
 */
export function selectBiome(sessionsStarted) {
  if (sessionsStarted < BIOME_CATALOG.length) return BIOME_CATALOG[sessionsStarted]; // Requirement 4.1
  const idx = Math.floor(Math.random() * BIOME_CATALOG.length); // Requirement 4.2
  return BIOME_CATALOG[idx];
}

/**
 * Selecciona el Active_Time_Of_Day para una Game_Session, replicando
 * exactamente el patrón fijo-luego-aleatorio de `selectBoss`
 * (src/data/bossRoster.js) sobre TIME_OF_DAY_CATALOG. Función pura: mismo
 * `sessionsStarted`, mismo comportamiento (determinista para
 * sessionsStarted < TIME_OF_DAY_CATALOG.length).
 *
 * - Para las primeras 4 Game_Session (sessionsStarted en [0,3]), devuelve
 *   siempre la entrada en ese índice fijo.
 * - A partir de la 5ta Game_Session (sessionsStarted >= 4), devuelve una
 *   entrada aleatoria del catálogo, permitiendo repeticiones.
 *
 * @param {number} sessionsStarted - Game_Session ya iniciadas antes de esta
 *   selección.
 * @returns {typeof TIME_OF_DAY_CATALOG[number]}
 */
export function selectTimeOfDay(sessionsStarted) {
  if (sessionsStarted < TIME_OF_DAY_CATALOG.length) return TIME_OF_DAY_CATALOG[sessionsStarted]; // Requirement 5.1
  const idx = Math.floor(Math.random() * TIME_OF_DAY_CATALOG.length); // Requirement 5.2
  return TIME_OF_DAY_CATALOG[idx];
}

// Biome_Session_Counter / Time_Of_Day_Session_Counter: contadores en memoria
// a nivel de módulo, dueños exclusivos de la rotación por Game_Session.
// Ninguna función exportada de este módulo los reinicia (Requirement 9.2,
// 9.3): el único reinicio posible es la reinstanciación completa del módulo
// tras un recargo de página (Requirement 9.1).
let biomeSessionCounter = 0;        // Biome_Session_Counter — módulo, en memoria, Requirement 4.4/9.1
let timeOfDaySessionCounter = 0;    // Time_Of_Day_Session_Counter — módulo, en memoria, Requirement 5.4/9.1

/**
 * Selecciona el Active_Biome para una nueva Game_Session e incrementa el
 * Biome_Session_Counter en exactamente 1. Debe invocarse EXACTAMENTE una vez
 * por Game_Session, únicamente desde createTowerState/resetGame.
 * @returns {typeof BIOME_CATALOG[number]}
 */
export function nextBiomeForSession() {
  const entry = selectBiome(biomeSessionCounter);
  biomeSessionCounter += 1;         // Requirement 4.3
  return entry;
}

/** Análogo a nextBiomeForSession() para Time_Of_Day. Requirement 5.3. */
export function nextTimeOfDayForSession() {
  const entry = selectTimeOfDay(timeOfDaySessionCounter);
  timeOfDaySessionCounter += 1;     // Requirement 5.3
  return entry;
}
