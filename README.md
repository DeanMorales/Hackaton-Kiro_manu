# 🏰 Torre de las Nubes — Duelo AWS

Juego de navegador tipo "stack tower": construye una torre piso a piso mientras tu caballero asciende. Cada 5 pisos aparece una puerta que activa un duelo por turnos contra un "guardián" temático de AWS, resuelto respondiendo preguntas de opción múltiple sobre servicios de AWS (EC2, S3, Lambda, DynamoDB, VPC, IAM).

## 👥 Equipo

**Hackathon Kiro - Equipo 81**

Para contribuir al proyecto, lee primero [CONTRIBUTING.md](./CONTRIBUTING.md) que contiene las guías de colaboración y flujo de trabajo con Git.

## 📋 Prerrequisitos

- **Node.js** versión 18.x o superior
- Gestor de paquetes: `npm` (incluido con Node.js) o `yarn`/`pnpm`

## 🚀 Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone git@github.com:DeanMorales/Hackaton-Kiro_manu.git
cd Hackaton-Kiro_manu
```

### 2. Instalar dependencias

```bash
npm install
```

## 🎮 Ejecución

### Modo desarrollo

Inicia el servidor de desarrollo con recarga automática:

```bash
npm run dev
```

El juego estará disponible en `http://localhost:5173/` (o el puerto que indique la terminal).

### Build de producción

Genera los archivos estáticos optimizados para producción:

```bash
npm run build
```

Los archivos se generan en el directorio `dist/`.

### Previsualizar el build

Sirve el build de producción localmente para probarlo:

```bash
npm run preview
```

## Método anterior (ya no soportado)

⚠️ **Importante**: El método anterior de abrir `torre-de-las-nubes.html` directamente con doble clic **ya no está soportado** tras la migración a módulos ES y Vite.

Las dos rutas válidas de ejecución son:
1. **Modo desarrollo**: `npm run dev` (recomendado para desarrollo)
2. **Build + servidor estático**: `npm run build` + servir el directorio `dist/` con cualquier servidor de archivos estáticos

## 📜 Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Genera el build de producción
- `npm run preview` - Previsualiza el build de producción
- `npm test` - Ejecuta los tests (Vitest)
- `npm run check-circular` - Verifica que no haya imports circulares (requiere `madge` instalado)

## 📁 Estructura del proyecto

```
Hackaton-Kiro_manu/
├── src/
│   ├── data/         # Servicios AWS y banco de preguntas
│   ├── audio/        # Síntesis de efectos de sonido
│   ├── engine/       # Estado y física de la torre
│   ├── combat/       # Lógica del duelo contra el guardián
│   ├── render/       # Dibujo en canvas
│   ├── ui/           # Overlays DOM y HUD
│   └── main.js       # Bucle principal y wiring
├── index.html        # Punto de entrada HTML
├── package.json      # Dependencias y scripts
└── README.md         # Este archivo
```

## 🛠️ Tecnologías

- **JavaScript vanilla (ES6+)**: Sin frameworks UI ni TypeScript
- **Vite**: Build tool y servidor de desarrollo
- **Vitest + fast-check**: Testing (opcional, para desarrollo)
- **Canvas 2D**: Renderizado del mundo del juego
- **Web Audio API**: Síntesis de efectos de sonido en tiempo real

## 🌐 Compatibilidad

El juego funciona en las últimas versiones estables de:
- Chrome (escritorio y Android)
- Firefox
- Edge
- Safari (escritorio e iOS)

Requiere soporte para Canvas 2D y ES modules nativos. Web Audio API es opcional (el juego funciona sin sonido si no está disponible).

## 🤝 Contribuir

Lee nuestra [Guía de Contribución](./CONTRIBUTING.md) para conocer:
- Flujo de trabajo con Git (branching strategy)
- Convención de commits
- Proceso de Pull Requests
- Code review
- Mejores prácticas del equipo

## 📝 Licencia

Este proyecto fue desarrollado para el Hackathon Kiro.

---

**¿Preguntas?** Contacta al equipo o abre un issue en GitHub.
