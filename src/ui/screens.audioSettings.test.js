import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  showAudioSettingsPanel,
  bindAudioSettingsHandlers,
} from './screens.js';

/*
 * Tests de ejemplo (jsdom) para el segundo par de controles de efectos de
 * combate del Audio_Settings_Panel (tarea 6.4).
 *
 * Cubre:
 * - Los nuevos controles (#combatSfxVolumeSlider, #combatSfxMuteToggleBtn)
 *   existen en el DOM con las etiquetas correctas y distintas de las de música
 *   (Requirements 6.1, 6.2).
 * - `bindAudioSettingsHandlers` invoca los callbacks correctos al disparar
 *   `input`/`click` sobre ellos (Requirements 6.1, 6.2).
 */

/** Construye el DOM mínimo del Audio_Settings_Panel, replicando el marcado real de index.html. */
function buildDom() {
  document.body.innerHTML = `
    <button id="settingsBtn">Configuración</button>
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

describe('Audio_Settings_Panel — segundo par de controles de efectos de combate (jsdom)', () => {
  beforeEach(() => {
    buildDom();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('presencia y etiquetas de los controles (R6.1, R6.2)', () => {
    it('el slider de efectos de combate existe con su etiqueta, distinta de la del slider de música', () => {
      const combatSlider = document.getElementById('combatSfxVolumeSlider');
      const musicSlider = document.getElementById('volumeSlider');
      expect(combatSlider).not.toBeNull();
      expect(musicSlider).not.toBeNull();

      const combatLabel = document.querySelector('label[for="combatSfxVolumeSlider"]');
      const musicLabel = document.querySelector('label[for="volumeSlider"]');
      expect(combatLabel).not.toBeNull();
      expect(combatLabel.textContent).toBe('Volumen de efectos de combate');
      expect(musicLabel.textContent).toBe('Volumen de música');
      expect(combatLabel.textContent).not.toBe(musicLabel.textContent);
    });

    it('el botón de mute de efectos de combate existe con su texto inicial, distinto del de música', () => {
      const combatMuteBtn = document.getElementById('combatSfxMuteToggleBtn');
      const musicMuteBtn = document.getElementById('muteToggleBtn');
      expect(combatMuteBtn).not.toBeNull();
      expect(musicMuteBtn).not.toBeNull();

      expect(combatMuteBtn.textContent).toBe('Silenciar efectos de combate');
      expect(musicMuteBtn.textContent).toBe('Silenciar música');
      expect(combatMuteBtn.textContent).not.toBe(musicMuteBtn.textContent);
    });
  });

  describe('showAudioSettingsPanel refleja ambos pares de controles de forma independiente', () => {
    it('refleja los valores de música y de efectos de combate por separado', () => {
      showAudioSettingsPanel(50, false, 30, true, 1.5);

      const volumeSlider = document.getElementById('volumeSlider');
      const muteToggleBtn = document.getElementById('muteToggleBtn');
      const combatSfxVolumeSlider = document.getElementById('combatSfxVolumeSlider');
      const combatSfxMuteToggleBtn = document.getElementById('combatSfxMuteToggleBtn');

      expect(volumeSlider.value).toBe('50');
      expect(muteToggleBtn.textContent).toBe('Silenciar música');

      expect(combatSfxVolumeSlider.value).toBe('30');
      expect(combatSfxMuteToggleBtn.textContent).toBe('Activar efectos de combate');
    });
  });

  describe('bindAudioSettingsHandlers cablea los nuevos controles (R6.1, R6.2)', () => {
    it('dispara onCombatSfxVolumeChange con el valor numérico al disparar input en el slider', () => {
      const onCombatSfxVolumeChange = vi.fn();

      bindAudioSettingsHandlers({
        onToggleSettings: vi.fn(),
        onVolumeChange: vi.fn(),
        onToggleMute: vi.fn(),
        onCombatSfxVolumeChange,
        onToggleCombatSfxMute: vi.fn(),
        onCloseSettings: vi.fn(),
        onCelebrationBoostChange: vi.fn(),
      });

      const combatSfxVolumeSlider = document.getElementById('combatSfxVolumeSlider');
      combatSfxVolumeSlider.value = '75';
      combatSfxVolumeSlider.dispatchEvent(new Event('input'));

      expect(onCombatSfxVolumeChange).toHaveBeenCalledTimes(1);
      expect(onCombatSfxVolumeChange).toHaveBeenCalledWith(75);
      expect(typeof onCombatSfxVolumeChange.mock.calls[0][0]).toBe('number');
    });

    it('dispara onToggleCombatSfxMute al hacer click en el botón de mute de efectos de combate', () => {
      const onToggleCombatSfxMute = vi.fn();

      bindAudioSettingsHandlers({
        onToggleSettings: vi.fn(),
        onVolumeChange: vi.fn(),
        onToggleMute: vi.fn(),
        onCombatSfxVolumeChange: vi.fn(),
        onToggleCombatSfxMute,
        onCloseSettings: vi.fn(),
        onCelebrationBoostChange: vi.fn(),
      });

      const combatSfxMuteToggleBtn = document.getElementById('combatSfxMuteToggleBtn');
      combatSfxMuteToggleBtn.dispatchEvent(new Event('click'));

      expect(onToggleCombatSfxMute).toHaveBeenCalledTimes(1);
    });

    it('no invoca los callbacks de música al interactuar con los controles de combate, y viceversa', () => {
      const onVolumeChange = vi.fn();
      const onToggleMute = vi.fn();
      const onCombatSfxVolumeChange = vi.fn();
      const onToggleCombatSfxMute = vi.fn();

      bindAudioSettingsHandlers({
        onToggleSettings: vi.fn(),
        onVolumeChange,
        onToggleMute,
        onCombatSfxVolumeChange,
        onToggleCombatSfxMute,
        onCloseSettings: vi.fn(),
        onCelebrationBoostChange: vi.fn(),
      });

      const combatSfxVolumeSlider = document.getElementById('combatSfxVolumeSlider');
      combatSfxVolumeSlider.value = '10';
      combatSfxVolumeSlider.dispatchEvent(new Event('input'));
      document.getElementById('combatSfxMuteToggleBtn').dispatchEvent(new Event('click'));

      expect(onVolumeChange).not.toHaveBeenCalled();
      expect(onToggleMute).not.toHaveBeenCalled();

      const volumeSlider = document.getElementById('volumeSlider');
      volumeSlider.value = '20';
      volumeSlider.dispatchEvent(new Event('input'));
      document.getElementById('muteToggleBtn').dispatchEvent(new Event('click'));

      expect(onCombatSfxVolumeChange).toHaveBeenCalledTimes(1);
      expect(onToggleCombatSfxMute).toHaveBeenCalledTimes(1);
    });
  });
});
