# Requirements Document

## Introduction

Esta funcionalidad ajusta el anclaje vertical de la cámara de la torre y del área de combate en "Torre de las Nubes — Duelo AWS" cuando el juego se ejecuta en un dispositivo móvil en orientación landscape (horizontal), sin bloquear dicha orientación con un mensaje de "gira tu dispositivo".

El canvas ya es responsive: `resize()` en `src/main.js` usa `canvas.clientWidth`/`clientHeight` junto con un listener de `window.addEventListener('resize', resize)`, que ya cubre los cambios de tamaño producidos por una rotación de dispositivo sin necesidad de un listener de `orientationchange` separado.

El problema real es que tanto la cámara de la torre (`elevToScreen(camElev, elev, H)` en `src/render/draw.js`, usada por `drawTower`, `drawMovingBlock`, `drawKnight` y `drawGround`) como el área de combate contra jefes (`COMBAT_LAYOUT.groundYRatio` en `src/render/bossFightRender.js`, usada para calcular `groundY = H * COMBAT_LAYOUT.groundYRatio`) anclan verticalmente usando el mismo ratio fijo `0.62` del alto del canvas (`H`), independientemente de la orientación. En landscape móvil, `H` es mucho más pequeño que en portrait (por ejemplo, un viewport de 667×375 en vez de 375×667), mientras que los elementos dibujados (bloques de piso, caballero, Warrior_Sprite y Boss_Sprite) mantienen tamaños fijos en píxeles absolutos. Con el mismo ratio fijo y un `H` reducido, el espacio disponible por encima del punto de anclaje se comprime drásticamente, aumentando el riesgo de que el HUD superior (`#hud`, con `position:absolute; top:14px`) se solape visualmente con la torre o con los combatientes.

Esta funcionalidad introduce un `Vertical_Anchor_Ratio` distinto, mayor que el valor por defecto (`0.62`), que se aplica únicamente cuando se detecta `Landscape_Mobile_Mode`. Un ratio mayor desplaza el punto de anclaje (`Camera_Anchor` / `Combat_Ground_Anchor`) más hacia abajo en píxeles absolutos medidos desde el borde superior del canvas, dejando más espacio libre por encima de dicho punto para que la torre, el caballero, el Warrior_Sprite y el Boss_Sprite —que se dibujan extendiéndose hacia arriba desde el punto de anclaje— tengan margen antes de alcanzar la zona ocupada por el HUD.

Esta funcionalidad NO modifica los tamaños fijos en píxeles de los bloques, el caballero ni los sprites de combate (ese ajuste queda fuera de alcance; ver `combat-sprite-scaling` para el escalado ya existente de sprites de combate, y una posible spec futura `canvas-relative-physics-balance` para el escalado de físicas relativo al canvas). Tampoco modifica el comportamiento en orientación portrait, ni en landscape con suficiente alto de viewport (tablets/escritorio).

Todo el texto de cara al usuario se mantiene en español, en línea con las convenciones del producto.

## Glossary

- **Camera_Anchor**: Punto de anclaje vertical usado por `elevToScreen(camElev, elev, H)` en `src/render/draw.js` para convertir la elevación de un elemento de la torre (piso, Bloque en Movimiento, caballero) a una coordenada Y de pantalla. Se calcula como `H * Vertical_Anchor_Ratio - (elev - camElev)`.
- **Combat_Ground_Anchor**: Punto de anclaje vertical usado en `src/render/bossFightRender.js` (`drawCombatants`) para posicionar los pies del Warrior_Sprite y del Boss_Sprite durante un combate. Se calcula como `H * Vertical_Anchor_Ratio` (actualmente `COMBAT_LAYOUT.groundYRatio`).
- **Vertical_Anchor_Ratio**: Fracción de `H` (alto del canvas) usada para calcular Camera_Anchor y Combat_Ground_Anchor. Su valor varía según si Landscape_Mobile_Mode está activo o no.
- **Default_Vertical_Anchor_Ratio**: Valor de Vertical_Anchor_Ratio usado cuando Landscape_Mobile_Mode NO está activo (portrait, o landscape con suficiente alto de viewport). Su valor es `0.62`, sin cambios respecto al comportamiento actual.
- **Landscape_Vertical_Anchor_Ratio**: Valor de Vertical_Anchor_Ratio usado cuando Landscape_Mobile_Mode SÍ está activo. Su valor es `0.75`. Justificación: al ser mayor que Default_Vertical_Anchor_Ratio (0.62), Camera_Anchor y Combat_Ground_Anchor se desplazan más abajo en píxeles absolutos (`H * 0.75` en vez de `H * 0.62`), dejando más margen por encima del punto de anclaje para que la torre, el caballero y los Combat_Sprite —que se dibujan extendiéndose hacia arriba desde el punto de anclaje— no alcancen la zona superior del canvas donde se ubica el HUD, a costa de reducir proporcionalmente la banda de suelo visible por debajo del anclaje (de 38% a 25% de H), lo cual es aceptable dado que dicha banda es principalmente decorativa.
- **Landscape_Mobile_Mode**: Modo de layout activo cuando el viewport del juego cumple simultáneamente: (a) orientación landscape, es decir, el ancho del canvas (`W`) es mayor que su alto (`H`); y (b) el alto del canvas (`H`) es menor o igual a Landscape_Height_Threshold.
- **Landscape_Height_Threshold**: Umbral de alto de viewport, expresado en píxeles, por debajo o igual al cual un viewport landscape se considera móvil a efectos de Landscape_Mobile_Mode, en lugar de tablet o escritorio. Su valor es `520px` (mismo valor conceptual que `Mobile_Breakpoint` usado en las specs `combat-cards-mobile-layout` y `hud-responsive-layout`, pero aplicado a `H` en vez de a `W`, dado que en landscape es la altura la dimensión que se vuelve angosta).
- **HUD**: Contenedor superior de estado del juego, elemento DOM con `id="hud"` en `index.html`, posicionado con `position:absolute; top:14px` sobre el canvas del juego (definido también en la spec `hud-responsive-layout`).
- **Tower_Camera**: Subsistema de renderizado de la torre que usa Camera_Anchor, compuesto por `drawTower`, `drawMovingBlock`, `drawKnight` y `drawGround` en `src/render/draw.js`, todos ellos dependientes de `elevToScreen`.
- **Combat_Sprite**: Warrior_Sprite o Boss_Sprite dibujado durante un combate mediante `drawCombatants` en `src/render/bossFightRender.js`, posicionado en relación a Combat_Ground_Anchor.
- **Fixed_Pixel_Element**: Elemento visual cuyo tamaño en píxeles (ancho y/o alto) es un valor absoluto fijo en el código, no relativo a `H` ni a `W`. Incluye, entre otros, la altura de los bloques de piso, el tamaño del caballero dibujado en `drawKnight`, y las dimensiones base (`displayWidth`/`displayHeight`) de los Combat_Sprite antes de aplicar el `Sprite_Scale_Factor` de `combat-sprite-scaling`.

## Requirements

### Requirement 1: Detección de Landscape_Mobile_Mode

**User Story:** Como jugador en un dispositivo móvil en orientación horizontal, quiero que el juego detecte automáticamente que estoy en landscape móvil, para que pueda ajustar su layout vertical sin requerir ninguna acción de mi parte.

#### Acceptance Criteria

1. WHEN el ancho del canvas (`W`) es mayor que su alto (`H`) AND `H` es menor o igual a Landscape_Height_Threshold (520px), THE Tower_Camera SHALL activar Landscape_Mobile_Mode.
2. WHEN el ancho del canvas (`W`) es menor o igual a su alto (`H`), THE Tower_Camera SHALL mantener Landscape_Mobile_Mode desactivado, independientemente del valor de `H`.
3. WHEN el ancho del canvas (`W`) es mayor que su alto (`H`) AND `H` es mayor que Landscape_Height_Threshold (520px), THE Tower_Camera SHALL mantener Landscape_Mobile_Mode desactivado.
4. WHEN el jugador rota el dispositivo y el evento `resize` de `window` se dispara con nuevas dimensiones de canvas, THE Tower_Camera SHALL recalcular el estado de Landscape_Mobile_Mode a partir de las nuevas dimensiones de `W` y `H`, sin requerir recargar la página.

### Requirement 2: Vertical_Anchor_Ratio distinto para la cámara de la torre en Landscape_Mobile_Mode

**User Story:** Como jugador en landscape móvil, quiero que la torre, el caballero y los bloques se dibujen con más margen respecto al HUD superior, para poder ver el estado del juego sin que ambos elementos se solapen.

#### Acceptance Criteria

1. WHILE Landscape_Mobile_Mode está activo, THE Tower_Camera SHALL calcular Camera_Anchor usando Landscape_Vertical_Anchor_Ratio (0.75) en lugar de Default_Vertical_Anchor_Ratio (0.62).
2. WHILE Landscape_Mobile_Mode está activo, THE Tower_Camera SHALL aplicar el mismo Landscape_Vertical_Anchor_Ratio a todos los usos de Camera_Anchor dentro de `elevToScreen`, de modo que los pisos de la torre (`drawTower`), el Bloque en Movimiento (`drawMovingBlock`), el caballero (`drawKnight`) y el suelo (`drawGround`) permanezcan alineados entre sí.
3. WHILE Landscape_Mobile_Mode NO está activo, THE Tower_Camera SHALL calcular Camera_Anchor usando Default_Vertical_Anchor_Ratio (0.62), sin cambios respecto al comportamiento actual.

### Requirement 3: Vertical_Anchor_Ratio distinto para el área de combate en Landscape_Mobile_Mode

**User Story:** Como jugador en landscape móvil, quiero que el guerrero y el jefe se dibujen con más margen respecto al HUD superior durante un combate, para poder ver la interfaz de combate completa sin solapamientos.

#### Acceptance Criteria

1. WHILE Landscape_Mobile_Mode está activo, THE Combat_Ground_Anchor SHALL calcularse usando Landscape_Vertical_Anchor_Ratio (0.75) en lugar de Default_Vertical_Anchor_Ratio (0.62).
2. WHILE Landscape_Mobile_Mode NO está activo, THE Combat_Ground_Anchor SHALL calcularse usando Default_Vertical_Anchor_Ratio (0.62), sin cambios respecto al comportamiento actual.
3. WHILE Landscape_Mobile_Mode está activo, THE Combat_Ground_Anchor SHALL usar el mismo Vertical_Anchor_Ratio que Camera_Anchor (Requirement 2), de modo que la torre y el combate compartan el mismo punto de anclaje vertical relativo a `H`.

### Requirement 4: Sin cambios en portrait ni en landscape con suficiente alto de viewport

**User Story:** Como jugador en orientación portrait o en landscape en tablet/escritorio, quiero que el juego se vea exactamente igual que hoy, para que este ajuste de landscape móvil no afecte mi experiencia actual.

#### Acceptance Criteria

1. WHILE Landscape_Mobile_Mode NO está activo, THE Tower_Camera SHALL mantener sin cambios el valor de `anchorScreenY` calculado en `createTowerState` y `resetGame` (`height * 0.62`) en `src/engine/tower.js`.
2. WHILE Landscape_Mobile_Mode NO está activo, THE Combat_Ground_Anchor SHALL mantener sin cambios el valor de `COMBAT_LAYOUT.groundYRatio` (0.62) usado en `src/render/bossFightRender.js`.

### Requirement 5: Sin cambios en los tamaños fijos en píxeles de elementos visuales

**User Story:** Como responsable del alcance de esta funcionalidad, quiero que el ajuste de anclaje vertical no modifique los tamaños absolutos de los elementos dibujados, para mantener esta funcionalidad enfocada exclusivamente en el punto de anclaje y no en el escalado general de físicas.

#### Acceptance Criteria

1. WHILE Landscape_Mobile_Mode está activo, THE Tower_Camera SHALL mantener sin cambios los valores en píxeles de ancho y alto de cada Fixed_Pixel_Element, incluyendo la altura de los bloques de piso y el tamaño del caballero dibujado en `drawKnight`.
2. WHILE Landscape_Mobile_Mode está activo, THE Combat_Ground_Anchor SHALL mantener sin cambios el `Sprite_Scale_Factor` calculado por `computeSpriteScaleFactor(W)` en `src/render/bossFightRender.js`, dado que dicho factor depende únicamente de `W` y no de `H` ni de Landscape_Mobile_Mode.

### Requirement 6: El HUD no debe quedar cubierto por la torre ni por el combate en Landscape_Mobile_Mode

**User Story:** Como jugador en landscape móvil, quiero que el HUD superior permanezca siempre visible y legible, para poder consultar mi puntuación, el piso actual y el conteo de la puerta sin que la torre o el combate lo tapen.

#### Acceptance Criteria

1. WHILE Landscape_Mobile_Mode está activo AND la pantalla actual es la de construcción de la torre (`screen === 'build'`), THE Tower_Camera SHALL dibujar el piso superior de la torre y el caballero de modo que ningún píxel de dichos elementos se superponga con el área ocupada por el HUD.
2. WHILE Landscape_Mobile_Mode está activo AND la pantalla actual es de combate (`screen === 'boss'`), THE Combat_Ground_Anchor SHALL posicionar el Warrior_Sprite y el Boss_Sprite de modo que ningún píxel de dichos Combat_Sprite se superponga con el área ocupada por el HUD.
