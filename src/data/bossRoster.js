/**
 * Boss_Rotation: catálogo estático de los 5 Boss_Sprite disponibles y las
 * reglas de selección/rotación para los combates contra el guardián.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5, 7.4, 7.5
 */

export const BOSS_ROSTER = [
  {
    id: 'boss_1_titan_guerrero',
    jsonPath: '/sprites/bosses/boss_1_titan_guerrero/boss_1_titan_guerrero.json',
    displayName: 'Titán Guerrero',
    background: '/background/Fondo_Boss_1.png',
    attackAnimations: ['ataque_1', 'ataque_2'],
  },
  {
    id: 'boss_2_orco',
    jsonPath: '/sprites/bosses/boss_2_orco/boss_2_orco.json',
    displayName: 'Orco',
    background: '/background/Fondo_Boss_2.png',
    attackAnimations: ['ataque'],
  },
  {
    id: 'boss_3_tigre',
    jsonPath: '/sprites/bosses/boss_3_tigre/boss_3_tigre.json',
    displayName: 'Tigre',
    background: '/background/Fondo_Boss_3.png',
    attackAnimations: ['ataque'],
  },
  {
    id: 'boss_4_golem',
    jsonPath: '/sprites/bosses/boss_4_golem/boss_4_golem.json',
    displayName: 'Golem',
    background: '/background/Fondo_Boss_4.png',
    attackAnimations: ['ataque'],
  },
  {
    id: 'boss_5_brujo',
    jsonPath: '/sprites/bosses/boss_5_brujo/boss_5_brujo.json',
    displayName: 'Brujo',
    background: '/background/Fondo_Boss_5.png',
    attackAnimations: ['ataque'],
  },
];

/**
 * Selecciona el Boss_Sprite para el combate actual.
 *
 * - Para los primeros 5 combates de la sesión (bossesResolved en [0,4]),
 *   devuelve siempre la entrada en ese índice fijo (First_Round).
 * - A partir del 6to combate (bossesResolved >= 5), devuelve una entrada
 *   aleatoria del roster, permitiendo repeticiones.
 *
 * @param {number} bossesResolved - combates contra el guardián ya resueltos
 *   en la sesión actual (gameState.doorsPassed al iniciar el combate).
 * @returns {typeof BOSS_ROSTER[number]}
 */
export function selectBoss(bossesResolved) {
  if (bossesResolved < BOSS_ROSTER.length) return BOSS_ROSTER[bossesResolved]; // Requirement 4.1
  const idx = Math.floor(Math.random() * BOSS_ROSTER.length); // Requirement 4.2
  return BOSS_ROSTER[idx];
}

/**
 * Determina si un Boss_Sprite es el Alternating_Attack_Boss (tiene más de
 * una animación de ataque que alternar en fallos sucesivos).
 *
 * @param {typeof BOSS_ROSTER[number]} bossEntry
 * @returns {boolean}
 */
export function isAlternatingAttackBoss(bossEntry) {
  return bossEntry.attackAnimations.length > 1; // Requirement 7.4/7.5
}
