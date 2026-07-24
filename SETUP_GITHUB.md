# 📘 Guía de Configuración Inicial de GitHub

## Pasos para Subir el Proyecto por Primera Vez

### Paso 1: Crear la rama `develop` (si no existe)

Primero verificamos qué ramas existen:

```bash
git branch -a
```

Si no existe `develop`, la creamos:

```bash
git checkout -b develop
```

### Paso 2: Agregar los Archivos Importantes

Vamos a agregar los archivos esenciales para la colaboración:

```bash
# Agregar archivos de configuración del equipo
git add .gitignore
git add .github/pull_request_template.md
git add CONTRIBUTING.md
git add README.md

# Agregar el código del proyecto
git add index.html
git add torre-de-las-nubes.html
git add package.json
git add src/

# Agregar configuraciones de Kiro (specs y steering)
git add .kiro/
```

### Paso 3: Hacer el Commit Inicial

```bash
git commit -m "chore: configurar estructura de colaboración del equipo

- Añadir .gitignore para excluir node_modules y archivos temporales
- Añadir CONTRIBUTING.md con guías de Git Flow y convenciones
- Añadir template de Pull Request en .github/
- Actualizar README.md con instrucciones para el equipo
- Incluir arquitectura modular (src/) y specs de Kiro"
```

### Paso 4: Subir la Rama al Repositorio

```bash
# Subir la rama develop
git push -u origin develop
```

### Paso 5: (Opcional) Proteger las Ramas en GitHub

Ve a GitHub y configura protección de ramas:

1. Ir a: `Settings` → `Branches` → `Add branch protection rule`
2. Para `main`:
   - Branch name pattern: `main`
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require conversation resolution before merging
   
3. Repetir para `develop`

### Paso 6: Configurar la Rama por Defecto

En GitHub:
1. Ir a: `Settings` → `General` → `Default branch`
2. Cambiar de `main` a `develop`
3. Esto hace que los nuevos PRs se hagan automáticamente contra `develop`

## 🔄 Flujo Normal de Trabajo (Para Todo el Equipo)

### Cada vez que empiezas una nueva tarea:

```bash
# 1. Actualizar develop
git checkout develop
git pull origin develop

# 2. Crear rama para tu tarea
git checkout -b feature/nombre-de-tu-tarea

# 3. Trabajar y hacer commits
git add archivo-modificado.js
git commit -m "feat(modulo): descripción del cambio"

# 4. Subir tu rama
git push -u origin feature/nombre-de-tu-tarea

# 5. Crear Pull Request en GitHub
# 6. Esperar revisión y aprobación
# 7. Hacer merge desde GitHub
# 8. Actualizar tu local

git checkout develop
git pull origin develop
git branch -d feature/nombre-de-tu-tarea
```

## 🚨 Resolver Conflictos Comunes

### "Your branch is behind"

```bash
git pull origin develop
```

### "Merge conflict"

```bash
# Ver qué archivos tienen conflictos
git status

# Abrir los archivos y buscar:
# <<<<<<< HEAD
# =======
# >>>>>>>

# Editar manualmente, guardar, luego:
git add archivo-resuelto.js
git commit -m "fix: resolver conflictos"
git push
```

### "Permission denied" al hacer push

Verifica tu configuración SSH:

```bash
# Ver configuración actual
git remote -v

# Si usas HTTPS y quieres cambiar a SSH:
git remote set-url origin git@github.com:DeanMorales/Hackaton-Kiro_manu.git
```

## 📋 Comandos Útiles de Referencia Rápida

```bash
# Ver estado actual
git status

# Ver ramas locales
git branch

# Ver ramas remotas
git branch -r

# Ver todas las ramas
git branch -a

# Cambiar de rama
git checkout nombre-rama

# Crear y cambiar a nueva rama
git checkout -b nueva-rama

# Actualizar desde remoto
git pull

# Subir cambios
git push

# Ver historial de commits
git log --oneline --graph --all

# Ver diferencias no commiteadas
git diff

# Ver diferencias de un archivo específico
git diff archivo.js
```

## ⚙️ Configuración Recomendada de Git (Una Sola Vez)

```bash
# Configurar tu nombre y email
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"

# Editor por defecto (opcional)
git config --global core.editor "code --wait"

# Colores en la terminal
git config --global color.ui auto

# Auto-setup de tracking branches
git config --global push.autoSetupRemote true

# Evitar problemas de line endings en Windows
git config --global core.autocrlf true
```

---

**💡 Tip**: Guarda este archivo como referencia. Todos los comandos aquí son seguros de ejecutar.
