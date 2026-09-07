/*! Smart Card — card componibile a canvas per Home Assistant: si disegna
 *  trascinando forme singole (rettangolo, cerchio, testo, icona, valore di
 *  un sensore, misuratore, badge azione) invece di riempire un form fisso.
 *  Ogni forma è un "elemento" con posizione/dimensione in unità virtuali
 *  (indipendenti dai pixel reali, stesso principio del viewBox 0-100 già
 *  usato per le icone della Fucina) e un colore separato per tema chiaro/
 *  scuro. Fa parte della libreria di Faber Layout come sesta card, ma
 *  funziona anche da sola su qualunque dashboard.
 */
const SC_VERSION = "1.0.0";
console.info(`%c SMART CARD %c v${SC_VERSION} `,
  "color:#1c1400;background:#ffb020;font-weight:700;border-radius:4px 0 0 4px",
  "color:#ffe9c2;background:#1a1b21;border-radius:0 4px 4px 0");

const SC_DEFAULTS = { type: "custom:smart-card", name: "Smart Card", canvas: { w: 100, h: 60 }, elements: [] };
const SC_MIN_SIZE = 4;

const SC_ELEMENT_TYPES = [
  { type: "rect", label: "Rettangolo", icon: "mdi:square-outline" },
  { type: "circle", label: "Cerchio", icon: "mdi:circle-outline" },
  { type: "divider", label: "Divisore", icon: "mdi:minus" },
  { type: "text", label: "Testo", icon: "mdi:format-text" },
  { type: "icon", label: "Icona", icon: "mdi:shape-outline" },
  { type: "sensor-value", label: "Valore sensore", icon: "mdi:counter" },
  { type: "gauge", label: "Misuratore", icon: "mdi:speedometer" },
  { type: "action-badge", label: "Badge azione", icon: "mdi:gesture-tap-button" },
];

function scUid() { return "el" + Math.random().toString(36).slice(2, 9); }

function scDefaultElement(type) {
  const base = { id: scUid(), type, x: 10, y: 10, w: 30, h: 20 };
  switch (type) {
    case "rect": return Object.assign(base, { w: 40, h: 24,
      light: { color: "#e6890a" }, dark: { color: "#ffb020" } });
    case "circle": return Object.assign(base, { w: 22, h: 22,
      light: { color: "#2a86c9" }, dark: { color: "#47b5ff" } });
    case "divider": return Object.assign(base, { w: 60, h: 2,
      light: { color: "#00000030" }, dark: { color: "#ffffff30" } });
    case "text": return Object.assign(base, { w: 50, h: 12, text: "Testo", fontSize: 16, weight: 700, align: "left",
      light: { color: "#171a20" }, dark: { color: "#eaf1f8" } });
    case "icon": return Object.assign(base, { w: 14, h: 14, icon: "mdi:lightbulb",
      light: { color: "#171a20" }, dark: { color: "#eaf1f8" } });
    case "sensor-value": return Object.assign(base, { w: 34, h: 14, entity: "", decimals: 1, unit: "", fontSize: 20,
      light: { color: "#171a20" }, dark: { color: "#eaf1f8" } });
    case "gauge": return Object.assign(base, { w: 32, h: 32, entity: "", min: 0, max: 100,
      light: { color: "#2a86c9" }, dark: { color: "#47b5ff" } });
    case "action-badge": return Object.assign(base, { w: 16, h: 16, entity: "", icon_on: "mdi:lightbulb", icon_off: "mdi:lightbulb-outline",
      light: { color: "#e6890a" }, dark: { color: "#ffb020" } });
    default: return base;
  }
}

function scEsc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function scClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ---------------------------------------------------------------------------
// Disegno di UN elemento — condiviso identico tra l'anteprima reale (SmartCard)
// e la tela dell'editor (SmartCardEditor), così non esiste un secondo motore
// di disegno che potrebbe disallinearsi dal primo.
function scElementInner(el, isDark, hass) {
  const c = (isDark ? el.dark : el.light) || {};
  const color = c.color || "#888";
  switch (el.type) {
    case "rect":
      return `<div style="width:100%;height:100%;background:${color};border-radius:${(el.radius ?? 8) / 10}em"></div>`;
    case "circle":
      return `<div style="width:100%;height:100%;background:${color};border-radius:50%"></div>`;
    case "divider":
      return `<div style="width:100%;height:100%;background:${color};border-radius:2px"></div>`;
    case "text":
      return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:${el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start"};
        color:${color};font-size:${el.fontSize || 16}px;font-weight:${el.weight || 700};line-height:1.15;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${scEsc(el.text || "")}</div>`;
    case "icon":
      return `<ha-icon icon="${scEsc(el.icon || "mdi:help")}" style="width:100%;height:100%;color:${color};--mdc-icon-size:100%"></ha-icon>`;
    case "sensor-value": {
      const st = hass && el.entity ? hass.states[el.entity] : null;
      let txt = "–";
      if (st) {
        const n = parseFloat(st.state);
        txt = isNaN(n) ? st.state : n.toFixed(el.decimals ?? 1);
        const unit = el.unit || (st.attributes && st.attributes.unit_of_measurement) || "";
        if (unit) txt += " " + unit;
      }
      return `<div data-live="value" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        color:${color};font-size:${el.fontSize || 20}px;font-weight:800;font-variant-numeric:tabular-nums">${scEsc(txt)}</div>`;
    }
    case "gauge": {
      const st = hass && el.entity ? hass.states[el.entity] : null;
      const v = st ? parseFloat(st.state) : NaN;
      const min = el.min ?? 0, max = el.max ?? 100;
      const frac = isNaN(v) ? 0 : scClamp((v - min) / (max - min || 1), 0, 1);
      const R = 40, C = 2 * Math.PI * R;
      return `<svg viewBox="0 0 100 100" data-live="gauge" style="width:100%;height:100%;display:block">
        <circle cx="50" cy="50" r="${R}" fill="none" stroke="rgba(128,128,128,.25)" stroke-width="10"/>
        <circle data-arc cx="50" cy="50" r="${R}" fill="none" stroke="${color}" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(2)}"
          transform="rotate(-90 50 50)"/>
        <text data-val x="50" y="56" text-anchor="middle" font-size="22" font-weight="800" fill="${color}">${isNaN(v) ? "–" : Math.round(v)}</text>
      </svg>`;
    }
    case "action-badge": {
      const st = hass && el.entity ? hass.states[el.entity] : null;
      const on = st && st.state === "on";
      return `<div data-live="badge" data-on="${on ? 1 : 0}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;
        border-radius:50%;background:${on ? color + "26" : "transparent"};cursor:pointer">
        <ha-icon icon="${scEsc(on ? el.icon_on : el.icon_off)}" style="width:70%;height:70%;color:${color};--mdc-icon-size:100%"></ha-icon>
      </div>`;
    }
    default: return "";
  }
}

// ---------------------------------------------------------------------------
// Runtime — la card vera che compare sulla dashboard.
class SmartCard extends HTMLElement {
  setConfig(config) {
    this._cfg = Object.assign({}, SC_DEFAULTS, config || {}, {
      canvas: Object.assign({}, SC_DEFAULTS.canvas, (config && config.canvas) || {}),
      elements: (config && config.elements) || [],
    });
    this._built = false;
  }

  set hass(hass) {
    this._hass = hass;
    const isDark = !!(hass.themes && hass.themes.darkMode);
    if (!this._built || this._lastDark !== isDark) {
      this._lastDark = isDark;
      this._built = true;
      this._build();
    } else {
      this._update();
    }
  }

  getCardSize() { return Math.max(1, Math.round((this._cfg.canvas.h || 60) / 20)); }
  static getConfigElement() { return document.createElement("smart-card-editor"); }
  static getStubConfig() {
    return { type: "custom:smart-card", name: "Smart Card", canvas: { w: 100, h: 50 },
      elements: [scDefaultElement("text"), scDefaultElement("sensor-value")] };
  }

  _build() {
    const cfg = this._cfg;
    const isDark = this._lastDark;
    const elsHTML = cfg.elements.filter(el => !el.hidden).map(el => `
      <div class="sc-el" data-el-id="${el.id}" data-el-type="${el.type}"
        style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%">
        ${scElementInner(el, isDark, this._hass)}
      </div>`).join("");
    this.innerHTML = `
      <style>
        .sc-root{container-type:inline-size;display:block}
        .sc-card{position:relative;width:100%;aspect-ratio:${cfg.canvas.w}/${cfg.canvas.h};overflow:hidden;
          border-radius:16px;background:var(--ha-card-background,var(--card-background-color,#1a1b21))}
        .sc-el{overflow:hidden}
      </style>
      <div class="sc-root"><div class="sc-card">${elsHTML}</div></div>`;
    this.querySelectorAll('[data-live="badge"]').forEach(node => {
      node.addEventListener("click", e => {
        e.stopPropagation();
        const wrap = node.closest(".sc-el");
        const el = this._cfg.elements.find(x => x.id === wrap.dataset.elId);
        if (el && el.entity && this._hass.states[el.entity]) {
          this._hass.callService(el.entity.split(".")[0], "toggle", { entity_id: el.entity });
        }
      });
    });
  }

  // Ad ogni aggiornamento di stato tocca SOLO i nodi con un valore live —
  // niente ridisegno completo, per restare fluidi anche con tante Smart Card
  // sulla stessa vista.
  _update() {
    const hass = this._hass;
    this._cfg.elements.forEach(el => {
      if (el.hidden) return;
      const wrap = this.querySelector(`[data-el-id="${el.id}"]`);
      if (!wrap) return;
      if (el.type === "sensor-value") {
        const valNode = wrap.querySelector('[data-live="value"]');
        if (valNode) {
          const st = el.entity ? hass.states[el.entity] : null;
          let txt = "–";
          if (st) {
            const n = parseFloat(st.state);
            txt = isNaN(n) ? st.state : n.toFixed(el.decimals ?? 1);
            const unit = el.unit || (st.attributes && st.attributes.unit_of_measurement) || "";
            if (unit) txt += " " + unit;
          }
          valNode.textContent = txt;
        }
      } else if (el.type === "gauge") {
        const svg = wrap.querySelector('[data-live="gauge"]');
        if (svg) {
          const st = el.entity ? hass.states[el.entity] : null;
          const v = st ? parseFloat(st.state) : NaN;
          const min = el.min ?? 0, max = el.max ?? 100;
          const frac = isNaN(v) ? 0 : scClamp((v - min) / (max - min || 1), 0, 1);
          const R = 40, C = 2 * Math.PI * R;
          const arc = svg.querySelector("[data-arc]");
          if (arc) arc.setAttribute("stroke-dashoffset", (C * (1 - frac)).toFixed(2));
          const val = svg.querySelector("[data-val]");
          if (val) val.textContent = isNaN(v) ? "–" : Math.round(v);
        }
      } else if (el.type === "action-badge") {
        const badge = wrap.querySelector('[data-live="badge"]');
        if (badge) {
          const st = el.entity ? hass.states[el.entity] : null;
          const on = st && st.state === "on";
          const isDark = this._lastDark;
          const color = ((isDark ? el.dark : el.light) || {}).color || "#888";
          badge.dataset.on = on ? "1" : "0";
          badge.style.background = on ? color + "26" : "transparent";
          const ic = badge.querySelector("ha-icon");
          if (ic) ic.setAttribute("icon", on ? el.icon_on : el.icon_off);
        }
      }
    });
  }
}
customElements.define("smart-card", SmartCard);

// ---------------------------------------------------------------------------
// Editor — il designer a canvas vero e proprio.
const SCE_CSS = `
  .sce{display:flex;flex-direction:column;gap:14px;padding:6px 2px;font-family:inherit}
  .sce label{font-size:13px;font-weight:600;color:var(--primary-text-color)}
  .sce input,.sce select{padding:9px 10px;border-radius:8px;font-size:14px;font-family:inherit;width:100%;
    border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
  .sce-fld{display:flex;flex-direction:column;gap:6px}
  .sce-row{display:flex;gap:10px}.sce-row>.sce-fld{flex:1}
  .sce-section-title{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--secondary-text-color)}
  .sce-palette{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
  .sce-tpl{display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 10px;border-radius:12px;
    border:1.5px solid var(--divider-color);background:var(--card-background-color);cursor:pointer;flex:0 0 auto;min-width:64px}
  .sce-tpl ha-icon{--mdc-icon-size:20px;color:var(--primary-color)}
  .sce-tpl span{font-size:9.5px;font-weight:700;color:var(--primary-text-color);text-align:center}
  .sce-toolbar{display:flex;align-items:center;gap:8px}
  .sce-themebtn{padding:6px 12px;border-radius:999px;border:1.5px solid var(--divider-color);background:var(--card-background-color);
    color:var(--secondary-text-color);font-size:12px;font-weight:700;cursor:pointer}
  .sce-themebtn.sel{border-color:var(--primary-color);color:var(--primary-text-color);background:rgba(var(--rgb-primary-color,3,169,244),.12)}
  .sce-stage-wrap{background:repeating-conic-gradient(#8883 0% 25%,#0000 0% 50%) 50%/16px 16px;border-radius:14px;padding:14px}
  .sce-stage{position:relative;width:100%;margin:0 auto;max-width:420px;border-radius:10px;overflow:hidden;
    background:var(--ha-card-background,var(--card-background-color));box-shadow:0 4px 20px rgba(0,0,0,.25);touch-action:none}
  .sce-el{position:absolute;cursor:grab}
  .sce-el.sel{outline:2px solid var(--primary-color);outline-offset:1px}
  .sce-el-inner{width:100%;height:100%;overflow:hidden}
  .sce-handle{position:absolute;width:16px;height:16px;margin:-8px;border-radius:50%;background:var(--primary-color);
    border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);touch-action:none;z-index:2}
  .sce-handle.nw{left:0;top:0;cursor:nwse-resize}.sce-handle.ne{left:100%;top:0;cursor:nesw-resize}
  .sce-handle.sw{left:0;top:100%;cursor:nesw-resize}.sce-handle.se{left:100%;top:100%;cursor:nwse-resize}
  .sce-layers{display:flex;flex-direction:column;gap:6px}
  .sce-layer{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1.5px solid var(--divider-color);
    background:var(--card-background-color);cursor:pointer}
  .sce-layer.sel{border-color:var(--primary-color)}
  .sce-layer ha-icon{--mdc-icon-size:16px;color:var(--secondary-text-color);flex:0 0 auto}
  .sce-layer-name{flex:1;font-size:12.5px;font-weight:700;color:var(--primary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sce-icbtn{width:26px;height:26px;border-radius:50%;border:none;background:none;color:var(--secondary-text-color);
    cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .sce-icbtn:hover{color:var(--primary-text-color)}
  .sce-empty{color:var(--secondary-text-color);font-size:12.5px;text-align:center;padding:16px}
  .sce-props{border-top:1px solid var(--divider-color);padding-top:12px;display:flex;flex-direction:column;gap:12px}
  .sce-color-row{display:flex;gap:10px}
  .sce-swatch{display:flex;align-items:center;gap:6px;flex:1}
  .sce-swatch input[type=color]{width:36px;height:36px;padding:0;border-radius:8px;border:1px solid var(--divider-color);cursor:pointer}
  .sce-pickwrap{position:relative}
  .sce-pickwrap input{padding-right:30px}
  .sce-clear{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:none;background:none;
    color:var(--secondary-text-color);font-size:14px;cursor:pointer;padding:4px}
  .sce-optlist{position:absolute;z-index:999;top:calc(100% + 2px);left:0;right:0;max-height:200px;overflow-y:auto;
    background:var(--card-background-color,#1c1f26);border:1px solid var(--divider-color);border-radius:8px;box-shadow:0 10px 26px rgba(0,0,0,.45)}
  .sce-opt{padding:8px 11px;font-size:13px;color:var(--primary-text-color);cursor:pointer}
  .sce-opt:hover{background:rgba(var(--rgb-primary-color,3,169,244),.14)}
  .sce-opt small{display:block;font-size:10px;color:var(--secondary-text-color)}
`;

class SmartCardEditor extends HTMLElement {
  setConfig(config) {
    const merged = Object.assign({}, SC_DEFAULTS, config || {}, {
      canvas: Object.assign({}, SC_DEFAULTS.canvas, (config && config.canvas) || {}),
      elements: (config && config.elements) ? config.elements.map(e => Object.assign({}, e)) : [],
    });
    if (this._internalChange) { this._internalChange = false; this._config = merged; return; }
    this._config = merged;
    this._render();
  }
  set hass(h) { this._hass = h; if (h && this._config && !this._built) { this._render(); this._built = true; } }

  _emit() { this._internalChange = true; this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
  _esc(s) { return scEsc(s); }
  _entityName(id) { const hs = this._hass ? this._hass.states : {}; return (hs[id] && hs[id].attributes && hs[id].attributes.friendly_name) || id; }
  _isDark() { return !!this._previewDark; }
  _elById(id) { return this._config.elements.find(e => e.id === id); }

  _render() {
    if (!this._config) return;
    const c = this._config;
    const sel = this._sel && this._elById(this._sel);
    this.innerHTML = `<style>${SCE_CSS}</style>
    <div class="sce">
      <div class="sce-fld"><label>Nome</label><input id="sceName" value="${this._esc(c.name || "")}"></div>
      <div class="sce-fld">
        <div class="sce-section-title">Aggiungi una forma</div>
        <div class="sce-palette">
          ${SC_ELEMENT_TYPES.map(t => `<button type="button" class="sce-tpl" data-type="${t.type}">
            <ha-icon icon="${t.icon}"></ha-icon><span>${this._esc(t.label)}</span></button>`).join("")}
        </div>
      </div>
      <div class="sce-toolbar">
        <div class="sce-section-title" style="flex:1">Tela</div>
        <button type="button" class="sce-themebtn${!this._previewDark ? " sel" : ""}" data-theme="light">☀️ Chiaro</button>
        <button type="button" class="sce-themebtn${this._previewDark ? " sel" : ""}" data-theme="dark">🌙 Scuro</button>
      </div>
      <div class="sce-stage-wrap">
        <div class="sce-stage" id="sceStage" style="aspect-ratio:${c.canvas.w}/${c.canvas.h}">
          ${c.elements.filter(el => !el.hidden).map(el => this._elHTML(el)).join("")}
        </div>
      </div>
      <div class="sce-fld">
        <div class="sce-section-title">Livelli</div>
        <div class="sce-layers">
          ${c.elements.length ? [...c.elements].reverse().map(el => this._layerRowHTML(el)).join("") : '<div class="sce-empty">Nessuna forma — aggiungine una sopra</div>'}
        </div>
      </div>
      ${sel ? `<div class="sce-props" id="sceProps">${this._propsHTML(sel)}</div>` : ""}
    </div>`;
    this._wireTop();
    this._wireStage();
    this._wireLayers();
    if (sel) this._wireProps(sel);
  }

  _elHTML(el) {
    const isSel = el.id === this._sel;
    return `<div class="sce-el${isSel ? " sel" : ""}" data-el-id="${el.id}"
      style="left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%">
      <div class="sce-el-inner">${scElementInner(el, this._isDark(), this._hass)}</div>
      ${isSel ? `<div class="sce-handle nw" data-corner="nw"></div><div class="sce-handle ne" data-corner="ne"></div>
        <div class="sce-handle sw" data-corner="sw"></div><div class="sce-handle se" data-corner="se"></div>` : ""}
    </div>`;
  }

  _layerRowHTML(el) {
    const t = SC_ELEMENT_TYPES.find(x => x.type === el.type) || {};
    const label = el.type === "text" ? (el.text || "Testo") : el.entity ? this._entityName(el.entity) : t.label;
    return `<div class="sce-layer${el.id === this._sel ? " sel" : ""}" data-id="${el.id}">
      <ha-icon icon="${t.icon || "mdi:shape"}"></ha-icon>
      <div class="sce-layer-name">${this._esc(label)}</div>
      <button type="button" class="sce-icbtn" data-act="up" title="Sposta su">▲</button>
      <button type="button" class="sce-icbtn" data-act="down" title="Sposta giù">▼</button>
      <button type="button" class="sce-icbtn" data-act="hide" title="${el.hidden ? "Mostra" : "Nascondi"}">${el.hidden ? "🚫" : "👁"}</button>
      <button type="button" class="sce-icbtn" data-act="del" title="Elimina">🗑</button>
    </div>`;
  }

  _propsHTML(el) {
    const parts = [`<div class="sce-section-title">Proprietà</div>`];
    if (el.type === "text") {
      parts.push(`<div class="sce-fld"><label>Testo</label><input id="pText" value="${this._esc(el.text || "")}"></div>`);
      parts.push(`<div class="sce-row">
        <div class="sce-fld"><label>Dimensione testo</label><input id="pFontSize" type="number" min="8" max="80" value="${el.fontSize || 16}"></div>
        <div class="sce-fld"><label>Allineamento</label><select id="pAlign">
          <option value="left"${el.align !== "center" && el.align !== "right" ? " selected" : ""}>Sinistra</option>
          <option value="center"${el.align === "center" ? " selected" : ""}>Centro</option>
          <option value="right"${el.align === "right" ? " selected" : ""}>Destra</option>
        </select></div></div>`);
    } else if (el.type === "icon") {
      parts.push(`<div class="sce-fld"><label>Icona (es. mdi:lightbulb)</label><input id="pIcon" value="${this._esc(el.icon || "")}"></div>`);
    } else if (el.type === "sensor-value") {
      parts.push(this._pickerHTML("entity", el.entity, "Sensore"));
      parts.push(`<div class="sce-row">
        <div class="sce-fld"><label>Decimali</label><input id="pDecimals" type="number" min="0" max="4" value="${el.decimals ?? 1}"></div>
        <div class="sce-fld"><label>Unità (vuoto = automatica)</label><input id="pUnit" value="${this._esc(el.unit || "")}"></div></div>`);
    } else if (el.type === "gauge") {
      parts.push(this._pickerHTML("entity", el.entity, "Sensore"));
      parts.push(`<div class="sce-row">
        <div class="sce-fld"><label>Minimo</label><input id="pMin" type="number" value="${el.min ?? 0}"></div>
        <div class="sce-fld"><label>Massimo</label><input id="pMax" type="number" value="${el.max ?? 100}"></div></div>`);
    } else if (el.type === "action-badge") {
      parts.push(this._pickerHTML("entity", el.entity, "Presa / luce"));
      parts.push(`<div class="sce-row">
        <div class="sce-fld"><label>Icona accesa</label><input id="pIconOn" value="${this._esc(el.icon_on || "")}"></div>
        <div class="sce-fld"><label>Icona spenta</label><input id="pIconOff" value="${this._esc(el.icon_off || "")}"></div></div>`);
    }
    if (el.type !== "text" || true) {
      // colore — non serve per "divider" un'etichetta diversa, ma il concetto vale per tutti i tipi con un colore
    }
    parts.push(`<div class="sce-fld"><label>Colore chiaro / scuro</label>
      <div class="sce-color-row">
        <div class="sce-swatch"><input type="color" id="pColorLight" value="${(el.light && el.light.color) || "#5b6472"}"><span>Chiaro</span></div>
        <div class="sce-swatch"><input type="color" id="pColorDark" value="${(el.dark && el.dark.color) || "#8a94a1"}"><span>Scuro</span></div>
      </div></div>`);
    return parts.join("");
  }

  _pickerHTML(field, sel, label) {
    const shown = sel ? this._esc(this._entityName(sel)) : "";
    return `<div class="sce-fld sce-picker" data-field="${field}">
      <label>${label}</label>
      <div class="sce-pickwrap">
        <input type="text" class="sce-search" autocomplete="off" placeholder="Cerca entità..." value="${shown}">
        <button type="button" class="sce-clear" ${sel ? "" : "hidden"}>✕</button>
        <div class="sce-optlist" hidden></div>
      </div>
    </div>`;
  }

  _wireTop() {
    on(this, "#sceName", "input", e => { this._config.name = e.target.value; this._emit(); });
    this.querySelectorAll(".sce-themebtn").forEach(b => b.onclick = () => {
      this._previewDark = b.dataset.theme === "dark"; this._render();
    });
    this.querySelectorAll(".sce-tpl").forEach(b => b.onclick = () => {
      const el = scDefaultElement(b.dataset.type);
      this._config.elements.push(el);
      this._sel = el.id;
      this._dirty();
    });
  }

  _dirty() { this._emit(); this._render(); }

  _wireLayers() {
    this.querySelectorAll(".sce-layer").forEach(row => {
      const id = row.dataset.id;
      row.addEventListener("click", e => {
        const btn = e.target.closest("[data-act]");
        if (!btn) { this._sel = id; this._render(); return; }
        e.stopPropagation();
        const idx = this._config.elements.findIndex(x => x.id === id);
        if (btn.dataset.act === "up" && idx < this._config.elements.length - 1) {
          const [it] = this._config.elements.splice(idx, 1); this._config.elements.splice(idx + 1, 0, it);
        } else if (btn.dataset.act === "down" && idx > 0) {
          const [it] = this._config.elements.splice(idx, 1); this._config.elements.splice(idx - 1, 0, it);
        } else if (btn.dataset.act === "hide") {
          this._config.elements[idx].hidden = !this._config.elements[idx].hidden;
        } else if (btn.dataset.act === "del") {
          this._config.elements.splice(idx, 1);
          if (this._sel === id) this._sel = null;
        }
        this._dirty();
      });
    });
  }

  _wireProps(el) {
    on(this, "#pText", "input", e => { el.text = e.target.value; this._emit(); this._patchStage(el); });
    on(this, "#pFontSize", "change", e => { el.fontSize = parseInt(e.target.value) || 16; this._dirty(); });
    on(this, "#pAlign", "change", e => { el.align = e.target.value; this._dirty(); });
    on(this, "#pIcon", "input", e => { el.icon = e.target.value; this._emit(); this._patchStage(el); });
    on(this, "#pDecimals", "change", e => { el.decimals = parseInt(e.target.value) || 0; this._dirty(); });
    on(this, "#pUnit", "input", e => { el.unit = e.target.value; this._emit(); this._patchStage(el); });
    on(this, "#pMin", "change", e => { el.min = parseFloat(e.target.value) || 0; this._dirty(); });
    on(this, "#pMax", "change", e => { el.max = parseFloat(e.target.value) || 100; this._dirty(); });
    on(this, "#pIconOn", "input", e => { el.icon_on = e.target.value; this._emit(); this._patchStage(el); });
    on(this, "#pIconOff", "input", e => { el.icon_off = e.target.value; this._emit(); this._patchStage(el); });
    on(this, "#pColorLight", "input", e => { el.light = { color: e.target.value }; this._emit(); this._patchStage(el); });
    on(this, "#pColorDark", "input", e => { el.dark = { color: e.target.value }; this._emit(); this._patchStage(el); });
    this.querySelectorAll(".sce-picker").forEach(p => this._wirePicker(p, el));
  }

  _patchStage(el) {
    const wrap = this.querySelector(`.sce-stage [data-el-id="${el.id}"]`);
    const inner = wrap && wrap.querySelector(".sce-el-inner");
    if (inner) inner.innerHTML = scElementInner(el, this._isDark(), this._hass);
    const layerRow = this.querySelector(`.sce-layer[data-id="${el.id}"] .sce-layer-name`);
    if (layerRow && el.type === "text") layerRow.textContent = el.text || "Testo";
  }

  _wirePicker(container, el) {
    const field = container.dataset.field;
    const input = container.querySelector(".sce-search");
    const list = container.querySelector(".sce-optlist");
    const clearBtn = container.querySelector(".sce-clear");
    const hs = this._hass ? this._hass.states : {};
    const ids = Object.keys(hs);
    const renderList = filterText => {
      const f = (filterText || "").toLowerCase().trim();
      const matches = (f === "" ? ids : ids.filter(id => this._entityName(id).toLowerCase().includes(f) || id.toLowerCase().includes(f))).slice(0, 80);
      list.innerHTML = matches.length
        ? matches.map(id => `<div class="sce-opt" data-val="${id}">${this._esc(this._entityName(id))}<small>${id}</small></div>`).join("")
        : `<div class="sce-opt">Nessun risultato</div>`;
      list.hidden = false;
    };
    input.addEventListener("focus", () => renderList(""));
    input.addEventListener("input", () => renderList(input.value));
    input.addEventListener("blur", () => setTimeout(() => { list.hidden = true; }, 150));
    list.addEventListener("mousedown", e => {
      const opt = e.target.closest(".sce-opt[data-val]");
      if (!opt) return;
      e.preventDefault();
      el[field] = opt.dataset.val;
      input.value = this._entityName(opt.dataset.val);
      clearBtn.hidden = false;
      list.hidden = true;
      this._dirty();
    });
    clearBtn.addEventListener("mousedown", e => {
      e.preventDefault();
      el[field] = "";
      input.value = "";
      clearBtn.hidden = true;
      this._dirty();
    });
  }

  // ---------------- Trascinamento (sposta) e ridimensionamento (maniglie) ----------------
  // Stessa tecnica di img2dxf.js: soglia di movimento accumulato per
  // distinguere un tocco (seleziona) da un trascinamento (sposta), e delta
  // sempre calcolato dallo snapshot iniziale (mai incrementale) per evitare
  // derive. Durante il gesto si aggiorna solo lo style dell'elemento toccato
  // (niente ridisegno completo): il config-changed parte una volta sola al
  // rilascio, per non inondare l'host di eventi durante un trascinamento.
  _wireStage() {
    const stage = this.querySelector("#sceStage");
    if (!stage) return;
    stage.querySelectorAll(".sce-el").forEach(wrap => {
      wrap.addEventListener("pointerdown", e => {
        if (e.target.closest(".sce-handle")) return;
        this._onElPointerDown(e, wrap);
      });
    });
    stage.querySelectorAll(".sce-handle").forEach(h => {
      h.addEventListener("pointerdown", e => { e.stopPropagation(); this._onHandlePointerDown(e, h); });
    });
  }

  _onElPointerDown(e, wrap) {
    e.preventDefault();
    const id = wrap.dataset.elId;
    const el = this._elById(id);
    const wasSelected = this._sel === id;
    const stage = this.querySelector("#sceStage");
    const rect = stage.getBoundingClientRect();
    const orig = { x: el.x, y: el.y };
    let lastX = e.clientX, lastY = e.clientY, moved = 0, engaged = false;
    const move = ev => {
      if (!wasSelected) return;
      moved += Math.abs(ev.clientX - lastX) + Math.abs(ev.clientY - lastY);
      lastX = ev.clientX; lastY = ev.clientY;
      if (!engaged && moved > 8) engaged = true;
      if (engaged) {
        const dxU = (ev.clientX - e.clientX) / rect.width * this._config.canvas.w;
        const dyU = (ev.clientY - e.clientY) / rect.height * this._config.canvas.h;
        el.x = scClamp(orig.x + dxU, 0, this._config.canvas.w - el.w);
        el.y = scClamp(orig.y + dyU, 0, this._config.canvas.h - el.h);
        wrap.style.left = el.x + "%"; wrap.style.top = el.y + "%";
      }
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      if (!wasSelected) { this._sel = id; this._render(); return; }
      if (engaged) this._emit();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, { once: true });
  }

  _onHandlePointerDown(e, handle) {
    e.preventDefault();
    const wrap = handle.closest(".sce-el");
    const id = wrap.dataset.elId;
    const el = this._elById(id);
    const corner = handle.dataset.corner;
    const stage = this.querySelector("#sceStage");
    const rect = stage.getBoundingClientRect();
    const orig = { x: el.x, y: el.y, w: el.w, h: el.h };
    const startX = e.clientX, startY = e.clientY;
    const move = ev => {
      const dxU = (ev.clientX - startX) / rect.width * this._config.canvas.w;
      const dyU = (ev.clientY - startY) / rect.height * this._config.canvas.h;
      let { x, y, w, h } = orig;
      if (corner === "se") { w = orig.w + dxU; h = orig.h + dyU; }
      else if (corner === "sw") { x = orig.x + dxU; w = orig.w - dxU; h = orig.h + dyU; }
      else if (corner === "ne") { y = orig.y + dyU; w = orig.w + dxU; h = orig.h - dyU; }
      else if (corner === "nw") { x = orig.x + dxU; y = orig.y + dyU; w = orig.w - dxU; h = orig.h - dyU; }
      w = Math.max(SC_MIN_SIZE, w); h = Math.max(SC_MIN_SIZE, h);
      x = scClamp(x, 0, this._config.canvas.w - w); y = scClamp(y, 0, this._config.canvas.h - h);
      el.x = x; el.y = y; el.w = w; el.h = h;
      wrap.style.left = x + "%"; wrap.style.top = y + "%"; wrap.style.width = w + "%"; wrap.style.height = h + "%";
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      this._emit();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, { once: true });
  }
}
function on(root, sel, ev, fn) { const el = root.querySelector(sel); if (el) el.addEventListener(ev, fn); }
customElements.define("smart-card-editor", SmartCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "smart-card",
  name: "Smart Card",
  description: "Card componibile a canvas: disegna forme singole (rettangolo, cerchio, testo, icona, valore sensore, misuratore, badge azione), ognuna riordinabile come un livello, con colori separati per tema chiaro/scuro — per quando serve qualcosa di completamente su misura invece di un template fisso.",
  preview: true,
  documentationURL: "https://github.com/cristianwebonline/ha-smart-card",
});
