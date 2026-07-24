# Producto: Torre de las Nubes — Duelo AWS

## Descripción
Juego de navegador (HTML5, un solo archivo) tipo "stack tower": el jugador construye una torre piso a piso soltando bloques en movimiento mientras su caballero asciende. Cada 5 pisos aparece una puerta que activa un duelo por turnos contra un "guardián" temático de AWS, resuelto respondiendo preguntas de opción múltiple sobre servicios de AWS (EC2, S3, Lambda, DynamoDB, VPC, IAM).

## Objetivo del jugador
- Apilar bloques con precisión para no caer de la torre.
- Superar duelos de preguntas para avanzar de nivel.
- Repasar/aprender conceptos básicos de servicios AWS de forma gamificada.

## Bucle de juego
1. Pantalla de inicio con reglas → botón "Comenzar a construir".
2. Fase de construcción: el jugador suelta bloques en movimiento (clic, tap o barra espaciadora) para apilarlos sobre la torre.
3. Cada 5 pisos se activa una puerta → comienza un combate contra un guardián.
4. Combate: cartas de servicios AWS; acertar la pregunta daña al jefe, fallar daña al jugador. El número de cartas (según el nivel) define aciertos necesarios y fallos tolerables.
5. Ganar el combate → se reanuda la construcción (la dificultad/velocidad aumenta con la altura). Perder el combate o fallar el apilado → pantalla de Game Over con opción de reintentar ("Reconstruir la torre").

## Audiencia
Personas estudiando para certificaciones AWS o que quieren repasar servicios básicos de forma lúdica.

## Idioma
Todo el contenido de cara al usuario está en español. Los nuevos textos de UI y preguntas deben mantenerse en español para ser consistentes.
