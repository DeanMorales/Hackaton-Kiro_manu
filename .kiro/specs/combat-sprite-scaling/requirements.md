# Requirements Document

## Introduction

Torre de las Nubes dibuja al Warrior_Sprite y al Boss_Sprite durante un combate mediante `SpriteAnimationEngine.draw()` (`src/render/spriteEngine.js`), que pasa `displayWidth`/`displayHeight` (valores fijos leídos del JSON de metadata de cada sprite, p. ej. 550x750 para los bosses) directamente a `ctx.drawImage(...)`, sin ningún factor de escala relativo al ancho del canvas `W`. En un canvas móvil de 375px de ancho, el Boss_Sprite (550px de ancho) es más ancho que todo el área visible del canvas, y los desplazamientos fijos en píxeles de `src/render/bossFightRender.js` (`BOSS_HORIZONTAL_OFFSET_PX`, `WARRIOR_HORIZONTAL_OFFSET_PX`, `VERTICAL_OFFSET_PX`, `BOSS_EXTRA_VERTICAL_OFFSET_PX`) agravan el desajuste porque fueron calibrados para el tamaño de sprite sin escalar.

Esta feature introduce un factor de escala que reduce proporcionalmente el tamaño de dibujo del Warrior_Sprite y del Boss_Sprite en canvases angostos, sin modificar los archivos JSON de metadata de los sprites, sin alterar la apariencia actual en canvases de escritorio, y preservando el posicionamiento correcto de ambos personajes entre sí y respecto a la línea de suelo compartida (`groundY`).

## Glossary

- **Combat_Sprite**: El Warrior_Sprite o el Boss_Sprite dibujado durante `screen === 'boss'` mediante una instancia de `SpriteAnimationEngine`.
- **Sprite_Metadata**: El objeto JSON cargado por `SpriteAnimationEngine` para un Combat_Sprite, que incluye `displayWidth`/`displayHeight` (dimensiones de dibujo sin escalar).
- **Reference_Canvas_Width**: El ancho de canvas, en píxeles, para el cual `displayWidth`/`displayHeight` de `Sprite_Metadata` fueron calibrados sin necesitar reducción (comportamiento de escritorio actual).
- **Sprite_Scale_Factor**: Un número en el rango `(0, 1]` calculado a partir del ancho actual del canvas `W`, aplicado multiplicativamente a `displayWidth`/`displayHeight` de un Combat_Sprite antes de dibujarlo.
- **Minimum_Scale_Factor**: El valor mínimo permitido para `Sprite_Scale_Factor`, por debajo del cual un Combat_Sprite dejaría de ser legible.
- **Scaled_Display_Width** / **Scaled_Display_Height**: El resultado de multiplicar `displayWidth`/`displayHeight` de `Sprite_Metadata` por `Sprite_Scale_Factor`.
- **Ground_Line**: La coordenada `groundY = H * COMBAT_LAYOUT.groundYRatio` compartida por ambos Combat_Sprite, sobre la cual se apoyan sus pies.
- **Combat_Layout_Offset**: Cualquiera de los desplazamientos fijos en píxeles definidos en `src/render/bossFightRender.js` (`VERTICAL_OFFSET_PX`, `BOSS_EXTRA_VERTICAL_OFFSET_PX`, `BOSS_HORIZONTAL_OFFSET_PX`, `WARRIOR_HORIZONTAL_OFFSET_PX`).
- **Boss_Fight_Renderer**: El módulo `src/render/bossFightRender.js`, responsable de `drawCombatants()` y `drawBattleBackground()`.
- **Sprite_Animation_Engine**: La clase `SpriteAnimationEngine` (`src/render/spriteEngine.js`), responsable de `draw()` y del ciclo de animación de un Combat_Sprite.

## Requirements

### Requirement 1: Cálculo del Sprite_Scale_Factor

**User Story:** Como jugador en un dispositivo móvil, quiero que los sprites de combate se dibujen a un tamaño proporcional al ancho de mi pantalla, para poder ver a ambos personajes completos sin que se salgan del canvas.

#### Acceptance Criteria

1. THE Boss_Fight_Renderer SHALL compute a Sprite_Scale_Factor from the current canvas width `W` and a Reference_Canvas_Width constant.
2. WHEN `W` is greater than or equal to Reference_Canvas_Width, THE Boss_Fight_Renderer SHALL compute a Sprite_Scale_Factor equal to `1`.
3. WHEN `W` is less than Reference_Canvas_Width, THE Boss_Fight_Renderer SHALL compute a Sprite_Scale_Factor strictly less than `1` and proportional to the ratio between `W` and Reference_Canvas_Width.
4. IF the computed Sprite_Scale_Factor is less than Minimum_Scale_Factor, THEN THE Boss_Fight_Renderer SHALL clamp the Sprite_Scale_Factor to Minimum_Scale_Factor.
5. FOR ALL canvas widths `W > 0`, THE Boss_Fight_Renderer SHALL compute a Sprite_Scale_Factor within the closed range `[Minimum_Scale_Factor, 1]`.
6. FOR ALL identical values of `W`, THE Boss_Fight_Renderer SHALL compute an identical Sprite_Scale_Factor (deterministic, side-effect-free calculation).

### Requirement 2: Aplicación del escalado a las dimensiones de dibujo

**User Story:** Como jugador, quiero que el guerrero y el boss se reduzcan de tamaño de forma proporcional entre sí, para que la diferencia visual de tamaño entre ambos personajes se mantenga en cualquier dispositivo.

#### Acceptance Criteria

1. WHEN drawing a Combat_Sprite, THE Boss_Fight_Renderer SHALL compute its Scaled_Display_Width and Scaled_Display_Height by multiplying `displayWidth`/`displayHeight` from Sprite_Metadata by the same Sprite_Scale_Factor used for the other Combat_Sprite in the current draw call.
2. THE Boss_Fight_Renderer SHALL pass Scaled_Display_Width and Scaled_Display_Height to Sprite_Animation_Engine for rendering, without modifying `displayWidth`/`displayHeight` stored on the Sprite_Animation_Engine instance.
3. THE Boss_Fight_Renderer SHALL NOT require any change to the JSON metadata files of the Warrior_Sprite or any Boss_Sprite in order to compute Scaled_Display_Width and Scaled_Display_Height.
4. FOR ALL valid Sprite_Metadata and FOR ALL Sprite_Scale_Factor values in `[Minimum_Scale_Factor, 1]`, THE Boss_Fight_Renderer SHALL compute a Scaled_Display_Width less than or equal to `displayWidth` and a Scaled_Display_Height less than or equal to `displayHeight` (invariant: scaling never enlarges a sprite beyond its authored size).
5. WHEN Sprite_Scale_Factor equals `1`, THE Boss_Fight_Renderer SHALL compute Scaled_Display_Width equal to `displayWidth` and Scaled_Display_Height equal to `displayHeight` (no visual change on desktop canvases).

### Requirement 3: Posicionamiento correcto tras el escalado

**User Story:** Como jugador, quiero que el guerrero y el boss sigan apoyados sobre la misma línea de suelo y ubicados en sus posiciones horizontales relativas correctas después de reducir su tamaño, para que el combate se vea coherente en cualquier tamaño de canvas.

#### Acceptance Criteria

1. WHEN drawing a Combat_Sprite, THE Boss_Fight_Renderer SHALL position its feet at the Ground_Line by computing the vertical draw origin from Scaled_Display_Height (not from the unscaled `displayHeight`).
2. WHEN drawing a Combat_Sprite, THE Boss_Fight_Renderer SHALL center it horizontally on its `COMBAT_LAYOUT` X ratio by computing the horizontal draw origin from Scaled_Display_Width (not from the unscaled `displayWidth`).
3. WHEN Sprite_Scale_Factor is less than `1`, THE Boss_Fight_Renderer SHALL scale each Combat_Layout_Offset by the same Sprite_Scale_Factor before applying it to the draw origin.
4. FOR ALL canvas dimensions `W > 0`, `H > 0` and FOR ALL valid Sprite_Metadata for the Warrior_Sprite and the Boss_Sprite, after `drawCombatants()` the horizontal center of the drawn Warrior_Sprite SHALL be strictly less than the horizontal center of the drawn Boss_Sprite.
5. FOR ALL canvas dimensions `W > 0`, `H > 0` and FOR ALL valid Sprite_Metadata for the Warrior_Sprite and the Boss_Sprite, after `drawCombatants()` the bottom edge of the drawn Warrior_Sprite and the bottom edge of the drawn Boss_Sprite SHALL each equal the Ground_Line plus the same fixed vertical adjustment used at Sprite_Scale_Factor `1` (round-trip invariant: scaling changes size, not the vertical alignment rule).

### Requirement 4: Legibilidad mínima y compatibilidad con escritorio

**User Story:** Como jugador, quiero que los sprites de combate nunca se reduzcan tanto que deje de distinguir sus animaciones, y que la experiencia de escritorio no cambie, para conservar una experiencia de juego consistente en cualquier dispositivo.

#### Acceptance Criteria

1. THE Boss_Fight_Renderer SHALL define a Minimum_Scale_Factor greater than `0`.
2. WHERE the canvas width `W` is at or above Reference_Canvas_Width, THE Boss_Fight_Renderer SHALL render Combat_Sprite instances at their unscaled `displayWidth`/`displayHeight`, matching current desktop appearance.
3. FOR ALL canvas widths `W > 0`, THE Boss_Fight_Renderer SHALL render each Combat_Sprite with a Scaled_Display_Width greater than or equal to `displayWidth * Minimum_Scale_Factor`.

### Requirement 5: No afectar el estado del combate ni el ciclo de animación

**User Story:** Como desarrollador, quiero que el escalado visual no interfiera con la lógica de combate ni con el ciclo de animación de los sprites, para no introducir regresiones en el resto del sistema.

#### Acceptance Criteria

1. WHEN `updateCombatants()` is called, THE Boss_Fight_Renderer SHALL advance each Sprite_Animation_Engine's animation frame exactly as before, independent of the Sprite_Scale_Factor.
2. THE Boss_Fight_Renderer SHALL NOT alter the values of `cardCount`, `playerPips`, `bossPips`, or any other combat-state field of the `fight` object produced by `startBossFight` as a result of computing or applying a Sprite_Scale_Factor.
3. THE Sprite_Animation_Engine SHALL NOT read canvas width or compute any Sprite_Scale_Factor itself; the Sprite_Scale_Factor SHALL be computed and applied exclusively by the Boss_Fight_Renderer.
