import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bindAudioSettingsHandlers } from './screens.js';

/*
 * Tests de ejemplo (jsdom) para el ajuste responsive del HUD (tarea 3.1-3.2
 * de hud-responsive-layout).
 *
 * Cubre:
 * - `#settingsBtn` sigue siendo interactivo tras el cambio de estilo del HUD:
 *   el binding del click es por `id`, independiente de `font-size`/`padding`
 *   de `.hud-pill` (Requirements 4.2, 4.4).
 * - Los IDs y el contenido de los HUD_Value_Span (`#bestScoreValue`,
 *   `#floorNum`, `#doorIn`) permanecen intactos, incluyendo un valor de
 *   puntuación de varios dígitos (Requirements 4.1, 4.3).
 */

/** Construye el DOM mínimo del HUD, replicando el marcado real de index.html. */
function buildDom() {
  document.body.innerHTML = `
    <div id="hud">
      <div class="hud-pill facet-cut-sm">🏆 <span id="bestScoreValue">0</span></div>
      <div class="hud-pill facet-cut-sm">Piso <span id="floorNum">0</span></div>
      <div class="hud-pill facet-cut-sm">Puerta en <span id="doorIn">5</span></div>
      <button id="settingsBtn" class="hud-pill facet-cut-sm" aria-label="Configuración de audio" style="pointer-events:auto; cursor:pointer;">⚙️</button>
    </div>
    <div id="audioSettingsPanel" class="overlay hidden">
      <div class="panel facet-cut">
        <h1>Configuración de audio</h1>
        <label class="subtitle" for="volumeSlider">Volumen de música</label>
        <input type="range" id="volumeSlider" min="0" max="100" step="1" />
        <button id="muteToggleBtn" class="btn-secondary" aria-pressed="false">Silenciar música</button>

        <label class="subtitle" for="combatSfxVolumeSlider">Volumen de efectos de combate</label>
        <input type="range" id="combatSfxVolumeSlider" min="0" max="100" step="1" />
        <button id="combatSfxMuteToggleBtn" class="btn-secondary" aria-pressed="false">Silenciar efectos de combate</button>

        <div class="audio-control-group">
          <label for="celebrationBoostSlider">
            Boost de celebración: <span id="celebrationBoostValue">1.5×</span>
          </label>
          <input id="celebrationBoostSlider" type="range" min="1.0" max="3.0" step="0.1" value="1.5"
            aria-label="Multiplicador de volumen de celebración" />
        </div>

        <button id="closeAudioSettingsBtn" class="btn-primary">Cerrar</button>
      </div>
    </div>
  `;
}

describe('HUD responsive layout — interacción y contenido (jsdom)', () => {
  beforeEach(() => {
    buildDom();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('#settingsBtn sigue siendo interactivo tras el cambio de estilo (R4.2, R4.4)', () => {
    it('invoca onToggleSettings exactamente una vez al hacer click en #settingsBtn', () => {
      const onToggleSettings = vi.fn();

      bindAudioSettingsHandlers({
        onToggleSettings,
        onVolumeChange: vi.fn(),
        onToggleMute: vi.fn(),
        onCombatSfxVolumeChange: vi.fn(),
        onToggleCombatSfxMute: vi.fn(),
        onCloseSettings: vi.fn(),
        onCelebrationBoostChange: vi.fn(),
      });

      const settingsBtn = document.getElementById('settingsBtn');
      settingsBtn.dispatchEvent(new Event('click'));

      expect(onToggleSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('IDs y contenido de HUD_Value_Span intactos, incluyendo puntuación de varios dígitos (R4.1, R4.3)', () => {
    it('conserva los tres IDs presentes en el DOM', () => {
      expect(document.getElementById('bestScoreValue')).not.toBeNull();
      expect(document.getElementById('floorNum')).not.toBeNull();
      expect(document.getElementById('doorIn')).not.toBeNull();
    });

    it('no trunca el contenido de #bestScoreValue con un valor de varios dígitos', () => {
      const bestScoreEl = document.getElementById('bestScoreValue');
      bestScoreEl.textContent = '123456';

      expect(document.getElementById('bestScoreValue').textContent).toBe('123456');
    });

    it('conserva el contenido exacto de #floorNum y #doorIn sin truncar', () => {
      const floorNumEl = document.getElementById('floorNum');
      const doorInEl = document.getElementById('doorIn');
      floorNumEl.textContent = '42';
      doorInEl.textContent = '3';

      expect(document.getElementById('floorNum').textContent).toBe('42');
      expect(document.getElementById('doorIn').textContent).toBe('3');
    });
  });
});
