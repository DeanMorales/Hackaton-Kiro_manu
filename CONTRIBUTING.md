# 🤝 Guía de Contribución - Torre de las Nubes

## Flujo de Trabajo con Git

### Modelo de Ramas (Git Flow Simplificado)

Usamos un modelo de ramas simplificado para el equipo:

```
main (producción estable)
  ├── develop (rama de desarrollo principal)
      ├── feature/nombre-feature (nuevas funcionalidades)
      ├── bugfix/nombre-bug (correcciones de bugs)
      └── hotfix/nombre-urgente (correcciones críticas)
```

#### Ramas Principales
- **`main`**: Código de producción estable. Solo se actualiza mediante pull requests aprobados.
- **`develop`**: Rama de integración. Todas las features se integran aquí antes de ir a `main`.

#### Ramas de Trabajo
- **`feature/nombre-descriptivo`**: Para nuevas funcionalidades
- **`bugfix/nombre-del-bug`**: Para corrección de errores
- **`hotfix/nombre-urgente`**: Para correcciones críticas en producción

### 📋 Proceso Paso a Paso

#### 1. Sincronizar con el Repositorio Remoto

Antes de empezar cualquier trabajo:

```bash
git checkout develop
git pull origin develop
```

#### 2. Crear una Nueva Rama

```bash
# Para una nueva funcionalidad
git checkout -b feature/mi-nueva-funcion

# Para un bugfix
git checkout -b bugfix/corregir-colision-bloques

# Para un hotfix urgente
git checkout -b hotfix/error-critico-combate
```

**Convención de nombres:**
- Usar kebab-case (palabras-separadas-por-guiones)
- Ser descriptivos pero concisos
- Ejemplos: `feature/añadir-servicio-rds`, `bugfix/error-al-soltar-bloque`

#### 3. Realizar Cambios y Commits

```bash
# Ver qué archivos cambiaron
git status

# Agregar archivos específicos (preferido)
git add src/combat/fight.js
git add src/data/services.js

# O agregar todos los cambios (usar con precaución)
git add .

# Hacer commit con mensaje descriptivo
git commit -m "tipo: descripción breve del cambio"
```

#### 4. Mensajes de Commit (Conventional Commits)

Usamos el formato **Conventional Commits** para mensajes claros:

```
tipo(ámbito): descripción breve en español

[cuerpo opcional con más detalles]

[footer opcional con referencias a issues]
```

**Tipos válidos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Refactorización de código (sin cambiar funcionalidad)
- `docs`: Cambios en documentación
- `style`: Cambios de formato (espacios, punto y coma, etc.)
- `test`: Añadir o modificar tests
- `chore`: Cambios en build, configuración, dependencias

**Ejemplos:**
```bash
git commit -m "feat(combat): añadir servicio CloudFront a preguntas de jefe"
git commit -m "fix(tower): corregir detección de colisión en bloques estrechos"
git commit -m "refactor(render): separar lógica de dibujo de nubes"
git commit -m "docs: actualizar README con instrucciones de instalación"
```

#### 5. Subir tu Rama al Repositorio

```bash
# Primera vez que subes la rama
git push -u origin feature/mi-nueva-funcion

# Siguientes veces
git push
```

#### 6. Crear un Pull Request (PR)

1. Ve a GitHub: https://github.com/DeanMorales/Hackaton-Kiro_manu
2. Verás un botón "Compare & pull request" para tu rama
3. Completa el template del PR:
   - **Título**: Breve y descriptivo
   - **Descripción**: Qué cambios hiciste y por qué
   - **Tests**: Qué probaste
   - **Capturas**: Si aplica, añade screenshots o GIFs
4. Asigna **al menos 1 revisor** del equipo
5. Vincula issues relacionados (si existen)

#### 7. Revisión de Código (Code Review)

**Como autor del PR:**
- Responde a comentarios constructivamente
- Realiza los cambios solicitados en tu rama local
- Haz push de los cambios (se actualizan automáticamente en el PR)

**Como revisor:**
- Revisa el código con ojo crítico pero constructivo
- Deja comentarios específicos en las líneas de código
- Aprueba el PR si todo está bien
- Solicita cambios si algo necesita mejorarse

#### 8. Hacer Merge del PR

Una vez aprobado:
1. El autor o un maintainer hace el merge
2. Usar **"Squash and merge"** para mantener el historial limpio (opcional pero recomendado)
3. Eliminar la rama después del merge

#### 9. Actualizar tu Rama Local

```bash
# Cambiar a develop
git checkout develop

# Traer los últimos cambios
git pull origin develop

# Eliminar tu rama local ya mergeada
git branch -d feature/mi-nueva-funcion
```

## 🔄 Flujo de Trabajo Diario

```bash
# Inicio del día
git checkout develop
git pull origin develop
git checkout -b feature/mi-tarea-de-hoy

# Durante el día (commits frecuentes)
git add archivo-modificado.js
git commit -m "feat(modulo): progreso en funcionalidad X"
git push -u origin feature/mi-tarea-de-hoy

# Al finalizar la tarea
# Crear PR en GitHub
# Esperar revisión y aprobación
# Hacer merge

# Sincronizar develop
git checkout develop
git pull origin develop
```

## ⚠️ Reglas Importantes

### ✅ SÍ hacer:
- Pull de `develop` antes de crear una nueva rama
- Commits pequeños y frecuentes con mensajes claros
- Push de tu rama al menos una vez al día (backup)
- Pedir revisión de código antes de hacer merge
- Probar tus cambios antes de hacer PR
- Resolver conflictos localmente antes de pushear

### ❌ NO hacer:
- **NUNCA** hacer push directo a `main`
- **NUNCA** hacer push directo a `develop` (usar PRs)
- **NUNCA** hacer `git push --force` sin consultar al equipo
- No commitear archivos temporales o personales
- No hacer commits gigantes con 20 archivos sin relación
- No ignorar conflictos de merge (pide ayuda si no sabes resolverlos)

## 🆘 Comandos Útiles para Problemas Comunes

### Deshice un cambio por error

```bash
# Ver el historial de commits
git log --oneline

# Volver a un commit anterior (sin perder cambios)
git reset --soft HEAD~1

# Descartar cambios no commiteados
git restore nombre-archivo.js

# Descartar TODOS los cambios no commiteados (¡cuidado!)
git restore .
```

### Tengo conflictos de merge

```bash
# Ver qué archivos tienen conflictos
git status

# Abrir archivo y buscar los marcadores:
# <<<<<<< HEAD
# tu código
# =======
# código del otro
# >>>>>>> rama-otra

# Resolver manualmente, luego:
git add archivo-resuelto.js
git commit -m "fix: resolver conflictos de merge"
```

### Olvidé crear una rama y trabajé en develop

```bash
# Guardar tus cambios
git stash

# Crear la rama correcta
git checkout -b feature/mi-feature

# Recuperar tus cambios
git stash pop
```

### Quiero actualizar mi rama con cambios de develop

```bash
# Desde tu rama de feature
git checkout feature/mi-rama

# Opción 1: Merge (recomendado para principiantes)
git merge develop

# Opción 2: Rebase (historial más limpio, más avanzado)
git rebase develop
```

## 📞 Comunicación del Equipo

- **Antes de empezar**: Avisa en el chat qué tarea vas a trabajar
- **Durante el trabajo**: Si te bloqueas, pide ayuda temprano
- **Al terminar**: Solicita revisión del PR con un mensaje al equipo
- **Conflictos**: Si hay merge conflicts, coordina con quien modificó el mismo archivo

## 🎯 Checklist antes de Crear un PR

- [ ] Mi código funciona localmente sin errores
- [ ] Probé la funcionalidad manualmente en el navegador
- [ ] Los mensajes de commit siguen la convención
- [ ] No incluí archivos temporales o personales
- [ ] Actualicé documentación si era necesario
- [ ] Mi rama está actualizada con `develop`
- [ ] El PR tiene un título y descripción claros

## 📚 Recursos

- [Git Flow Cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/)
- [Conventional Commits](https://www.conventionalcommits.org/es/)
- [GitHub Flow](https://docs.github.com/es/get-started/quickstart/github-flow)

---

**¿Preguntas?** No dudes en preguntar al equipo. Todos estamos aprendiendo juntos. 🚀
