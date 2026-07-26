# Bugfix Requirements Document

## Introduction

Durante un duelo contra un guardián (boss fight), cuando el jugador acierta la respuesta de una carta, el guerrero debería reproducir su sonido de ataque ubicado en `public/audio/guerrero/ataque/attack_sword.wav`. Actualmente ese sonido no se reproduce: al acertar solo suena el efecto sintetizado `sfx.correct()` (beeps generados con Web Audio API), pero nunca se reproduce el archivo `.wav` del ataque del guerrero.

La causa raíz está en la función `answerCard(idx, chosenIdx)` de la sección BOSS FIGHT: en la rama de respuesta correcta (`if(correct){ ... }`) se decrementa la vida del jefe y se llama a `sfx.correct()`, pero no existe ninguna reproducción del archivo de audio `attack_sword.wav` (no hay uso de `new Audio(...)` ni de elementos `<audio>` para archivos reales en el código).

El impacto es una pérdida de retroalimentación sonora: el ataque del guerrero se siente vacío porque falta el sonido de espada que refuerza la acción de acertar y dañar al guardián.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN el jugador acierta la respuesta de una carta durante un duelo (`answerCard` con `chosenIdx === card.question.correct`) THEN el sistema reproduce únicamente el beep sintetizado `sfx.correct()` y no reproduce el archivo `public/audio/guerrero/ataque/attack_sword.wav`.

1.2 WHEN se acierta una respuesta y se resta un pip de vida al guardián THEN el sistema no emite ningún sonido de ataque del guerrero (el archivo `attack_sword.wav` nunca se reproduce).

### Expected Behavior (Correct)

2.1 WHEN el jugador acierta la respuesta de una carta durante un duelo (`answerCard` con `chosenIdx === card.question.correct`) THEN el sistema SHALL reproducir el sonido del ataque del guerrero desde `public/audio/guerrero/ataque/attack_sword.wav`.

2.2 WHEN se acierta más de una respuesta a lo largo del duelo THEN el sistema SHALL reproducir el sonido `attack_sword.wav` en cada acierto, permitiendo aciertos consecutivos sin que un sonido en curso impida reproducir el siguiente.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN el jugador falla la respuesta de una carta (`chosenIdx !== card.question.correct`) THEN el sistema SHALL CONTINUE TO restar un pip al jugador y reproducir `sfx.wrong()` sin reproducir el sonido de ataque del guerrero.

3.2 WHEN el jugador acierta una respuesta THEN el sistema SHALL CONTINUE TO restar un pip de vida al guardián, actualizar las barras de vida (`renderPips`) y ejecutar la lógica de resolución del duelo (derrota del guardián, derrota del jugador y avance de carta) exactamente igual que antes.

3.3 WHEN ocurren los demás eventos de sonido del juego (`sfx.place`, `sfx.fall`, `sfx.wrong`, `sfx.win`, `sfx.lose`, `sfx.door` y el propio `sfx.correct`) THEN el sistema SHALL CONTINUE TO reproducirlos sin cambios.

3.4 WHEN el archivo `attack_sword.wav` no puede cargarse o el navegador bloquea la reproducción de audio THEN el sistema SHALL CONTINUE TO funcionar con normalidad (el duelo prosigue y no se lanza un error que interrumpa el juego).

## Bug Condition and Property

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AnswerEvent   // { duringBossFight, chosenIdx, correctIdx }
  OUTPUT: boolean

  // El bug se manifiesta al acertar una carta durante un duelo:
  // el sonido de ataque del guerrero (attack_sword.wav) no se reproduce.
  RETURN X.duringBossFight = true AND X.chosenIdx = X.correctIdx
END FUNCTION
```

### Property Specification (Fix Checking)

```pascal
// Property: Fix Checking - El acierto reproduce el sonido de ataque del guerrero
FOR ALL X WHERE isBugCondition(X) DO
  result ← answerCard'(X)
  ASSERT played(result, "public/audio/guerrero/ataque/attack_sword.wav")
END FOR
```

### Preservation Goal (Preservation Checking)

```pascal
// Property: Preservation Checking - Entradas que no disparan el bug se comportan igual
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT answerCard(X) = answerCard'(X)
END FOR
```

**Definiciones:**
- **F** (`answerCard`): la función original, que al acertar solo reproduce `sfx.correct()`.
- **F'** (`answerCard'`): la función corregida, que al acertar reproduce `sfx.correct()` y además el archivo `attack_sword.wav`.
- **C(X)**: acertar una carta durante un duelo (`duringBossFight AND chosenIdx === correctIdx`).
- **¬C(X)**: fallar una carta, o cualquier interacción fuera de un duelo activo — comportamiento que debe preservarse sin cambios.
