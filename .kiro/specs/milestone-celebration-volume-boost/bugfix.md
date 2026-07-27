# Bugfix Requirements Document

## Introduction

Este documento cubre dos bugs detectados en el flujo de celebración de hito (al vencer un guardián) y una feature de mejora de experiencia relacionada:

- **Bug 1 — Volumen de celebración demasiado bajo**: el audio de celebración hereda el volumen de la música de fondo, que tiene un valor por defecto de 6%. El jugador apenas escucha el sonido de victoria.
- **Bug 2 — El confeti no se ve**: la animación de confeti se lanza inmediatamente cuando `endFight(true)` es llamado, pero `#bossScreen` (z-index 100) permanece visible durante su transición CSS de cierre, tapando el canvas de confeti (z-index 15). El resultado es que el confeti es invisible durante la mayor parte de su duración.
- **Feature — Multiplicador de volumen para celebración**: el jugador debe poder configurar un boost de volumen independiente para los sonidos de hito (por defecto 1.5×, rango 1.0×–3.0×), con control en el panel de audio y persistencia en localStorage.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Volumen de celebración muy bajo**

1.1 WHEN `milestoneSfx.playMilestoneAudio(floorNumber)` es llamado al vencer un guardián THEN el sistema reproduce el sonido de celebración al volumen actual de la música de fondo (por defecto 6%), resultando en un audio prácticamente inaudible

1.2 WHEN el jugador no ha modificado el volumen de música desde el inicio THEN el sistema aplica el `DEFAULT_VOLUME` de música (6%) al sonido de celebración, ignorando que debería sonar notablemente más fuerte que la música ambiental

**Bug 2 — Confeti no visible**

1.3 WHEN `endFight(true)` es invocado y `showMilestoneCelebration(floorNumber)` se llama inmediatamente THEN el sistema crea el canvas de confeti (z-index 15) mientras `#bossScreen` (z-index 100) todavía está visible por su transición CSS de cierre, haciendo que el confeti quede oculto detrás de la pantalla de jefe durante la mayor parte de su duración

1.4 WHEN `ui.hideBossScreen()` se llama y existe una transición CSS de ocultado THEN el sistema lanza `animateConfetti` en el mismo tick, sin esperar a que la transición termine (~1 segundo), por lo que el confeti no es perceptible para el jugador

### Expected Behavior (Correct)

**Bug 1 — Volumen de celebración**

2.1 WHEN `milestoneSfx.playMilestoneAudio(floorNumber)` es llamado THEN el sistema SHALL calcular el volumen efectivo de celebración aplicando un multiplicador de boost (por defecto 1.5×) sobre el volumen base, con un techo de 1.0: `Math.min(1, volCtx.volume * boostMultiplier)`

2.2 WHEN el multiplicador de boost es 1.5× y el volumen de música es 6% THEN el sistema SHALL reproducir el sonido de celebración a `Math.min(1, 0.06 * 1.5) = 0.09` (9%), garantizando al menos que el boost es aplicado

2.3 WHEN el volumen de música es lo suficientemente alto como para que `volume * boost > 1` THEN el sistema SHALL limitar el volumen de reproducción a 1.0 (máximo de HTMLAudioElement.volume), sin lanzar errores ni distorsionar

**Bug 2 — Confeti visible**

2.4 WHEN `endFight(true)` es invocado THEN el sistema SHALL retrasar el inicio de la animación de confeti y el mensaje de piso hasta que `#bossScreen` haya completado su transición CSS de cierre (aproximadamente 1000 ms de delay mínimo)

2.5 WHEN `showMilestoneCelebration(floorNumber)` se ejecuta tras el delay THEN el sistema SHALL mostrar el confeti completamente visible, sin que ningún overlay de jefe lo tape

**Feature — Multiplicador de volumen configurable**

2.6 WHEN el jugador abre el panel de configuración de audio THEN el sistema SHALL mostrar un control (slider o toggle) para ajustar el multiplicador de boost de celebración, con un valor por defecto de 1.5×

2.7 WHEN el jugador ajusta el multiplicador de boost THEN el sistema SHALL persistir el valor en `localStorage` bajo la clave `celebrationVolumeBoost`

2.8 WHEN el juego se inicia y existe un valor guardado en `localStorage['celebrationVolumeBoost']` THEN el sistema SHALL restaurar ese valor como multiplicador activo en lugar del valor por defecto

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `milestoneSfx.playMilestoneAudio(floorNumber)` es llamado con un `floorNumber` que no es múltiplo de 15 ni de 30 THEN el sistema SHALL CONTINUE TO retornar sin reproducir ningún sonido (`selectMilestoneSound` devuelve `'none'`)

3.2 WHEN el audio está en modo `muted` (silenciado) THEN el sistema SHALL CONTINUE TO reproducir los sonidos de celebración a volumen 0, independientemente del multiplicador de boost configurado

3.3 WHEN el jugador ajusta el volumen de música en el panel de audio THEN el sistema SHALL CONTINUE TO actualizar únicamente el volumen de la música, sin alterar el multiplicador de boost de celebración

3.4 WHEN el jugador pierde un combate y `endFight(false)` es invocado THEN el sistema SHALL CONTINUE TO no mostrar confeti ni reproducir sonidos de celebración

3.5 WHEN el jugador tiene activada la preferencia de sistema `prefers-reduced-motion` THEN el sistema SHALL CONTINUE TO omitir el confeti y mostrar únicamente el mensaje de piso, con el delay aplicado igualmente para sincronización

3.6 WHEN `endFight(true)` es invocado y el estado del juego avanza a `'build'` THEN el sistema SHALL CONTINUE TO asignar `gameState.screen = 'build'` y llamar `music.enterBuildScreen()` sin verse afectado por el delay de la celebración visual

3.7 WHEN el panel de audio está visible y el jugador interactúa con controles preexistentes (volumen de música, mute, volumen de efectos de combate, mute de combate) THEN el sistema SHALL CONTINUE TO responder a esos controles de forma independiente al nuevo control de boost de celebración
