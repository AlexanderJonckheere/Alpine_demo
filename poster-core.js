// shared by the poster maker (index.html) and the gallery (gallery.html):
// the presets, the drawing code, a safety check and the database calls

const PALETTES = [
    ['#f4efe6', '#1d1d1b', '#e63946', '#1d3557', '#f1a208'],
    ['#0b0c2a', '#f2f2f2', '#ff4d6d', '#7b2cbf', '#4cc9f0'],
    ['#fdf0d5', '#003049', '#c1121f', '#669bbc', '#780000'],
    ['#111111', '#fafafa', '#fafafa', '#777777', '#333333'],
    ['#e9f5db', '#132a13', '#31572c', '#90a955', '#ecf39e'],
    ['#ffe5ec', '#590d22', '#ff4d6d', '#ff8fa3', '#c9184a'],
];

const PRESETS = {
    bauhaus: { title: 'BAUHAUS', subtitle: 'form follows function · 1919', titleSize: 110, shape: 'mix', cols: 4, rows: 5, size: 90, density: 85, rotation: 0, chaos: 0, colors: PALETTES[0], seed: 7 },
    'night dots': { title: 'night', subtitle: 'alpine.js · capita selecta', titleSize: 130, shape: 'circle', cols: 12, rows: 14, size: 70, density: 70, rotation: 0, chaos: 60, colors: PALETTES[1], seed: 3 },
    confetti: { title: 'party!', subtitle: 'saturday 22:00 · bring friends', titleSize: 120, shape: 'mix', cols: 9, rows: 11, size: 45, density: 60, rotation: 30, chaos: 100, colors: PALETTES[5], seed: 11 },
    lines: { title: 'flow', subtitle: 'study in rotation', titleSize: 140, shape: 'line', cols: 14, rows: 16, size: 100, density: 100, rotation: 45, chaos: 40, colors: PALETTES[3], seed: 5 },
    garden: { title: 'garden', subtitle: 'spring exhibition', titleSize: 120, shape: 'triangle', cols: 7, rows: 8, size: 80, density: 80, rotation: 0, chaos: 50, colors: PALETTES[4], seed: 21 },
};

const KINDS = ['circle', 'square', 'triangle', 'ring', 'line', 'mix'];
const MAX_TITLE = 24;
const MAX_SUBTITLE = 48;
const MAX_NAME = 20;

// a seeded random generator: the same seed always gives the same poster
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// posters can come from a link or from the database, so never trust them:
// numbers are clamped, colors must be #rrggbb, the shape must be a known one.
// without this, a "color" like `red" onload="...` would end up in the svg markup.
function sanitizePoster(raw = {}) {
    const fallback = PRESETS.bauhaus;
    const number = (value, min, max, def) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
    };
    const color = (value, def) => (/^#[0-9a-f]{6}$/i.test(value) ? value : def);

    return {
        title: String(raw.title ?? '').slice(0, MAX_TITLE),
        subtitle: String(raw.subtitle ?? '').slice(0, MAX_SUBTITLE),
        titleSize: number(raw.titleSize, 40, 140, fallback.titleSize),
        shape: KINDS.includes(raw.shape) ? raw.shape : fallback.shape,
        cols: number(raw.cols, 2, 16, fallback.cols),
        rows: number(raw.rows, 2, 18, fallback.rows),
        size: number(raw.size, 10, 140, fallback.size),
        density: number(raw.density, 10, 100, fallback.density),
        rotation: number(raw.rotation, 0, 180, fallback.rotation),
        chaos: number(raw.chaos, 0, 100, fallback.chaos),
        colors: fallback.colors.map((def, i) => color(Array.isArray(raw.colors) ? raw.colors[i] : null, def)),
        seed: number(raw.seed, 0, 1e9, 1),
        animate: raw.animate === true,
    };
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// all the shapes of a poster as svg markup
function posterShapes(p) {
    const { cols, rows, size, density, rotation, chaos, shape, colors, seed } = p;
    const random = mulberry32(seed);
    const top = 40, left = 40, width = 520, height = 560;
    const cell = Math.min(width / cols, height / rows);
    const offsetX = left + (width - cell * cols) / 2;
    const offsetY = top + (height - cell * rows) / 2;
    const c = chaos / 100;
    let out = '';

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const skip = random() > density / 100;
            const pick = random();
            const kindPick = random();
            const jx = (random() - .5) * cell * c;
            const jy = (random() - .5) * cell * c;
            const scale = 1 - random() * c * .6;
            const turn = rotation + (random() - .5) * 180 * c;
            if (skip) continue;

            const color = colors[2 + Math.floor(pick * 3)];
            const kind = shape === 'mix' ? ['circle', 'square', 'triangle', 'ring'][Math.floor(kindPick * 4)] : shape;
            const x = offsetX + (col + .5) * cell + jx;
            const y = offsetY + (row + .5) * cell + jy;
            const s = cell * size / 100 * scale / 2;
            const delay = `style="animation-delay: ${-((row + col) * .12).toFixed(2)}s"`;
            const rotate = `transform="rotate(${turn.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"`;

            if (kind === 'circle') {
                out += `<circle class="shape" ${delay} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${color}"/>`;
            } else if (kind === 'ring') {
                out += `<circle class="shape" ${delay} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(s * .8).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(s * .35).toFixed(1)}"/>`;
            } else if (kind === 'square') {
                out += `<rect class="shape" ${delay} ${rotate} x="${(x - s).toFixed(1)}" y="${(y - s).toFixed(1)}" width="${(s * 2).toFixed(1)}" height="${(s * 2).toFixed(1)}" fill="${color}"/>`;
            } else if (kind === 'triangle') {
                const pts = [-90, 30, 150].map(a => {
                    const r = (a * Math.PI) / 180;
                    return `${(x + Math.cos(r) * s * 1.15).toFixed(1)},${(y + Math.sin(r) * s * 1.15).toFixed(1)}`;
                }).join(' ');
                out += `<polygon class="shape" ${delay} ${rotate} points="${pts}" fill="${color}"/>`;
            } else {
                out += `<line class="shape" ${delay} ${rotate} x1="${(x - s).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + s).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="${Math.max(2, s * .22).toFixed(1)}" stroke-linecap="round"/>`;
            }
        }
    }
    return out;
}

// the inside of a complete poster <svg> (background, shapes, text), used by the gallery
function posterMarkup(p) {
    return `<rect width="600" height="800" fill="${p.colors[0]}"/>`
        + `<g>${posterShapes(p)}</g>`
        + `<text x="40" y="700" fill="${p.colors[1]}" font-size="${p.titleSize}" font-weight="800" font-family="system-ui, -apple-system, Helvetica, Arial, sans-serif" letter-spacing="-2">${escapeHtml(p.title)}</text>`
        + `<text x="44" y="752" fill="${p.colors[1]}" font-size="20" font-family="ui-monospace, Menlo, monospace" opacity=".8">${escapeHtml(p.subtitle)}</text>`;
}

// ---------- the database (Supabase) ----------

const GALLERY_TABLE = 'posters';

// null while supabase-config.js is still empty: the pages then run in demo mode
function galleryDb() {
    const { url, key } = window.SUPABASE_CONFIG || {};
    if (!url || !key || !window.supabase) return null;
    window.__galleryDb ??= window.supabase.createClient(url, key);
    return window.__galleryDb;
}

function cleanRow(row) {
    return {
        id: row.id,
        name: String(row.name ?? 'anonymous').slice(0, MAX_NAME),
        createdAt: row.created_at,
        poster: sanitizePoster(row.poster),
    };
}

async function submitPoster(name, poster) {
    const db = galleryDb();
    if (!db) throw new Error('The gallery is not connected yet (see supabase-config.js).');
    const { error } = await db.from(GALLERY_TABLE).insert({
        name: name.trim().slice(0, MAX_NAME),
        poster: sanitizePoster(poster),
    });
    if (error) throw error;
}

async function loadPosters() {
    const db = galleryDb();
    if (!db) return null;
    const { data, error } = await db
        .from(GALLERY_TABLE)
        .select('id, name, poster, created_at')
        .order('created_at', { ascending: true })
        .limit(300);
    if (error) throw error;
    return data.map(cleanRow);
}

// calls onNew(poster) for every poster that's submitted from now on
function watchPosters(onNew) {
    const db = galleryDb();
    if (!db) return null;
    return db
        .channel('posters-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: GALLERY_TABLE }, payload => onNew(cleanRow(payload.new)))
        .subscribe();
}
