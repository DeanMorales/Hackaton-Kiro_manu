/* ===== RENDER: Sprite_Animation_Engine genérico =====
   Motor de animación de sprites reutilizable para cualquier Sprite_Character
   (guerrero, bosses). No contiene ninguna rama condicional específica de
   personaje (Requirement 2.7). */

export class SpriteAnimationEngine {
  /**
   * @param {object} metadata - JSON parseado (displayWidth, displayHeight, frameWidth, frameHeight, animations).
   * @param {Map<string, HTMLImageElement>} images - una imagen precargada por animación (clave = nombre de animación).
   */
  constructor(metadata, images) {
    this.metadata = metadata || {};
    this.images = images || new Map();

    this.displayWidth = this.metadata.displayWidth;
    this.displayHeight = this.metadata.displayHeight;
    this.frameWidth = this.metadata.frameWidth;
    this.frameHeight = this.metadata.frameHeight;
    this.animations = this.metadata.animations || {};
    this.animationNames = Object.keys(this.animations);

    // Estado de reproducción (avance de frame implementado en la tarea 1.4).
    this._currentAnimationName = null;
    this._elapsed = 0;
    this._frameIndex = 0;
    this._once = false;
    this._resolvePlay = null;
    this._resolved = false;

    // true cuando load() no pudo completar la carga (JSON o todas sus imágenes);
    // update()/draw() quedan como no-op seguros en ese caso (ver Error Handling en design.md).
    this._loadFailed = false;
  }

  /**
   * Carga metadata + imágenes desde una carpeta base. No lanza si un archivo falla
   * (ver Error Handling en design.md): en ese caso se registra en consola y se
   * devuelve una instancia cuyo update()/draw() son no-op seguros, para que un
   * asset faltante no bloquee el resto del juego.
   *
   * Resuelve la URL final de cada `animation.file` concatenando `baseFolder` con
   * el nombre de archivo declarado en la metadata: `imageUrl = baseFolder + '/' + animation.file`.
   * `baseFolder` no debe terminar en `/`.
   *
   * @param {string} jsonPath - ruta al archivo JSON de metadata.
   * @param {string} baseFolder - carpeta base para resolver las imágenes (sin `/` final).
   * @returns {Promise<SpriteAnimationEngine>}
   */
  static async load(jsonPath, baseFolder) {
    try {
      const response = await fetch(jsonPath);
      if (!response.ok) {
        throw new Error(`SpriteAnimationEngine.load: HTTP ${response.status} al cargar ${jsonPath}`);
      }
      const metadata = await response.json();
      const animationNames = Object.keys(metadata.animations || {});

      const images = new Map();
      await Promise.all(animationNames.map((name) => {
        const animation = metadata.animations[name];
        const imageUrl = baseFolder + '/' + animation.file;
        return new Promise((resolve) => {
          try {
            const img = new Image();
            img.onload = () => { images.set(name, img); resolve(); };
            img.onerror = () => {
              console.error(`SpriteAnimationEngine.load: fallo al cargar la imagen "${imageUrl}" (animación "${name}")`);
              resolve(); // mejor esfuerzo: un asset faltante no bloquea el resto de la carga
            };
            img.src = imageUrl;
          } catch (e) {
            console.error(`SpriteAnimationEngine.load: excepción al precargar "${imageUrl}"`, e);
            resolve();
          }
        });
      }));

      return new SpriteAnimationEngine(metadata, images);
    } catch (e) {
      console.error(`SpriteAnimationEngine.load: fallo al cargar metadata desde "${jsonPath}" (baseFolder="${baseFolder}")`, e);
      const engine = new SpriteAnimationEngine({}, new Map());
      engine._loadFailed = true;
      return engine;
    }
  }

  /**
   * Inicia una Animation_Sequence desde su primer fotograma.
   *
   * Siempre reinicia `_elapsed`/`_frameIndex` a 0, sin importar el estado previo
   * (Requirement 2.8), y devuelve una nueva Promise que `update()` resolverá
   * exactamente una vez cuando la reproducción en modo `once`/`loop:false` llegue
   * a su último fotograma.
   *
   * Si `name` no existe en `this.animations`, no lanza: se registra una
   * advertencia en consola (ver Error Handling en design.md) y, como no hay
   * ninguna Animation_Sequence real que reproducir, la Promise se resuelve de
   * inmediato para no dejar colgado a ningún `await` de la orquestación.
   *
   * @param {string} name - nombre de la animación (clave en metadata.animations).
   * @param {{once?: boolean}} [opts]
   * @returns {Promise<void>}
   */
  play(name, opts) {
    this._elapsed = 0;
    this._frameIndex = 0;
    this._currentAnimationName = name;
    this._once = !!(opts && opts.once);
    this._resolved = false;

    if (!this.animations[name]) {
      console.warn(`SpriteAnimationEngine.play: animación "${name}" no existe en la metadata`);
      this._resolvePlay = null;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this._resolvePlay = resolve;
    });
  }

  /**
   * Avanza el fotograma de la animación en curso según su `fps` y el `dt` transcurrido
   * (Requirement 2.4), y resuelve la Promise de `play()` cuando corresponde.
   *
   * - Modo continuo (`_once === false` y `animation.loop !== false`, Requirement 2.6):
   *   `frameIndex = Math.floor(elapsed / frameDuration) % frameCount`.
   * - Modo `once` (`_once === true` o `animation.loop === false`, Requirement 2.5):
   *   al llegar o superar el último fotograma se fija `frameIndex = frameCount - 1`
   *   y se resuelve la Promise pendiente exactamente una vez por reproducción.
   *
   * No-op seguro si la carga falló o si no hay ninguna animación en curso (incluye
   * el caso de `play()` con un nombre inexistente, cuya animación no está en
   * `this.animations`).
   *
   * @param {number} dt - milisegundos transcurridos desde el último `update()`.
   */
  update(dt) {
    if (this._loadFailed || !this._currentAnimationName) return;

    const animation = this.animations[this._currentAnimationName];
    if (!animation) return;

    const frameDuration = 1000 / animation.fps;
    this._elapsed += dt;

    const frameCount = animation.frameCount;
    const isOnceMode = this._once === true || animation.loop === false;

    if (isOnceMode) {
      const rawFrameIndex = Math.floor(this._elapsed / frameDuration);
      if (rawFrameIndex >= frameCount - 1) {
        this._frameIndex = frameCount - 1;
        if (!this._resolved) {
          this._resolved = true;
          if (this._resolvePlay) this._resolvePlay();
        }
      } else {
        this._frameIndex = rawFrameIndex;
      }
    } else {
      this._frameIndex = Math.floor(this._elapsed / frameDuration) % frameCount;
    }
  }

  /**
   * Rectángulo fuente {sx, sy, sw, sh} del frame actual, según el `layout` declarado
   * en la animación en curso (`this._currentAnimationName`).
   *
   * - `layout: "grid"` (Requirement 2.2): la hoja está organizada en una grilla de
   *   `columns` x `rows`; `sx = (frameIndex % columns) * frameWidth`,
   *   `sy = Math.floor(frameIndex / columns) * frameHeight`.
   * - `layout: "row"` (Requirement 2.3): la hoja mide `frameWidth * frameCount` de
   *   ancho; `sx = frameIndex * frameWidth`, `sy = 0`.
   *
   * Si no hay ninguna animación en curso o la animación no existe en la metadata,
   * devuelve un rectángulo seguro en el origen (no-op de robustez).
   */
  getFrameRect() {
    const animation = this.animations[this._currentAnimationName];
    if (!animation) {
      return { sx: 0, sy: 0, sw: this.frameWidth, sh: this.frameHeight };
    }

    const frameIndex = this._frameIndex;
    let sx;
    let sy;

    if (animation.layout === 'grid') {
      const columns = animation.columns;
      sx = (frameIndex % columns) * this.frameWidth;
      sy = Math.floor(frameIndex / columns) * this.frameHeight;
    } else {
      // layout === 'row' (o cualquier otro valor: se trata como 'row' por robustez)
      sx = frameIndex * this.frameWidth;
      sy = 0;
    }

    return { sx, sy, sw: this.frameWidth, sh: this.frameHeight };
  }

  /**
   * Dibuja el frame actual escalado a `displayWidth`/`displayHeight` en la esquina
   * superior izquierda `(x, y)` (Requirement 2.7 — sin ninguna rama específica de
   * personaje: usa únicamente `this._currentAnimationName`, `this.images` y
   * `getFrameRect()`, genérico para cualquier Sprite_Character).
   *
   * No-op seguro (no lanza) si la carga falló (`_loadFailed`), si no hay ninguna
   * animación en curso (`_currentAnimationName` nulo), o si la imagen
   * correspondiente no está disponible en `this.images` (ver Error Handling en
   * design.md).
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - esquina superior izquierda, coordenada X.
   * @param {number} y - esquina superior izquierda, coordenada Y.
   */
  draw(ctx, x, y) {
    if (this._loadFailed || !this._currentAnimationName) return;

    const image = this.images.get(this._currentAnimationName);
    if (!image) return;

    const { sx, sy, sw, sh } = this.getFrameRect();
    ctx.drawImage(image, sx, sy, sw, sh, x, y, this.displayWidth, this.displayHeight);
  }

  /** Nombre de la animación en curso (para property tests / debugging). */
  get currentAnimationName() {
    return this._currentAnimationName;
  }
}
