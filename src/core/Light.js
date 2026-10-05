import penangSvg from '../assets/penang.svg?raw';

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uLine;
uniform sampler2D uGlow;
uniform vec4  uPlan;
uniform vec2  uSrc;
uniform float uWave;
uniform float uWidth, uTrail, uRest, uGlowAmt, uBase;
uniform float uGrid;
uniform vec3  uBg, uCold, uHot, uGlowCol;
out vec4 frag;

void main(){
  vec2 uv = (gl_FragCoord.xy - uPlan.xy) / uPlan.zw;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0){ frag = vec4(uBg, 1.0); return; }
  vec2 t = vec2(uv.x, 1.0 - uv.y);

  vec4 L = texture(uLine, t), G = texture(uGlow, t);
  float line = clamp(max(L.r, L.g * uGrid) * 1.9, 0.0, 1.0);
  float halo = max(G.r, G.g * uGrid);

  float ar   = uPlan.z / uPlan.w;
  float dist = length((uv - uSrc) * vec2(ar, 1.0)) / max(ar, 1.0);

  float front = 1.0 - smoothstep(0.0, uWidth, abs(dist - uWave));
  float trail = smoothstep(uWave, uWave - uTrail, dist) * uRest;
  float energy = max(front, trail);

  vec3  ink = mix(uCold, uHot, energy);
  float amt = line * (uBase + energy * (1.0 - uBase));
  vec3  col = mix(uBg, ink, clamp(amt, 0.0, 1.0)) + uGlowCol * halo * energy * uGlowAmt;
  frag = vec4(col, 1.0);
}`;

const TEX = 1440;
export const hex = (h) => {
  const s = String(h).trim().replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
};

let shared = null;

export default class Light {
  static get() { return (shared ||= new Light()); }

  constructor() {
    this.canvas = document.createElement('canvas');
    this.gl = this.canvas.getContext('webgl2', { antialias: true, alpha: false });
    this.ok = false;
    this.host = null;
    if (!this.gl || !this.build()) return;

    addEventListener('resize', () => this.measure());
    this.loadTextures();
  }

  build() {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src.trim()); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[Light] shader 编译失败', gl.getShaderInfoLog(s)); return null;
      }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[Light] link 失败', gl.getProgramInfoLog(prog)); return false;
    }
    gl.useProgram(prog);

    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n) => gl.getUniformLocation(prog, n);
    this.u = { plan:U('uPlan'), src:U('uSrc'), wave:U('uWave'), width:U('uWidth'),
               trail:U('uTrail'), rest:U('uRest'), glow:U('uGlowAmt'), base:U('uBase'),
               bg:U('uBg'), cold:U('uCold'), hot:U('uHot'), glowCol:U('uGlowCol'),
               grid:U('uGrid') };
    gl.uniform1i(U('uLine'), 0);
    gl.uniform1i(U('uGlow'), 1);
    return true;
  }

  loadTextures() {
    const img = new Image();
    img.onload = () => {
      const vb = penangSvg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
      this.ratio = vb[2] / vb[3];
      this.upload(this.raster(img, 0), 0);
      this.upload(this.raster(img, 7), 1);
      this.ok = true;
      this.measure();
      this.onready?.();
    };
    img.onerror = () => console.warn('[Light] SVG 光栅化失败');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(penangSvg);
  }

  raster(img, blur) {
    const c = document.createElement('canvas');
    c.width = Math.round(TEX * this.ratio); c.height = TEX;
    const x = c.getContext('2d');
    if (blur) x.filter = `blur(${blur}px)`;
    x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  upload(canvas, unit) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  attach(host, opts = {}) {
    if (!this.gl || this.host === host) return;
    this.host = host;
    this.fit = opts.fit || 'cover';
    host.appendChild(this.canvas);
    this.measure();
  }

  owns(host) { return this.ok && this.host === host; }

  measure() {
    if (!this.gl || !this.ratio || !this.host) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    const ch = this.canvas.height, cw = this.canvas.width;
    const ph = this.fit === 'contain'
      ? Math.min(ch * 0.94, cw * 0.82 / this.ratio)
      : Math.max(ch * 0.84, cw * 0.46 / this.ratio);
    this.plan = [(cw - ph * this.ratio) / 2, (ch - ph) / 2, ph * this.ratio, ph];
  }

  draw(o) {
    const gl = this.gl, u = this.u;
    if (!gl || !this.plan) return;
    gl.uniform4f(u.plan, ...this.plan);
    gl.uniform2f(u.src, o.srcX, o.srcY);
    gl.uniform1f(u.wave, o.wave);
    gl.uniform1f(u.width, o.width);
    gl.uniform1f(u.trail, o.trail);
    gl.uniform1f(u.rest, o.rest);
    gl.uniform1f(u.glow, o.glowAmt);
    gl.uniform1f(u.base, o.base);
    gl.uniform1f(u.grid, o.grid ?? 1);
    gl.uniform3fv(u.bg, o.bg); gl.uniform3fv(u.cold, o.cold);
    gl.uniform3fv(u.hot, o.hot); gl.uniform3fv(u.glowCol, o.glowCol);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
