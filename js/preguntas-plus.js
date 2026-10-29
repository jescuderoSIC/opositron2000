// ===== pregNNNN-plus.json =====
// Un único archivo por oposición con todo lo que se añade a cada pregunta:
//   { "28": { "nota": "texto en Markdown", "temas": ["22"],
//             "tags": ["#procedimiento", "#plazos"], "dificultad": "Medio",
//             "enlaces": ["[Ley 39/2015](https://www.boe.es/...)"] }, ... }
// "dificultad" es "Básico", "Medio", "Difícil" o null si no se ha indicado.
// En el navegador se sigue guardando por separado: las notas (pregunta → texto)
// y las fichas (pregunta → tags, dificultad y enlaces) las usa el test, y las asociaciones
// (tema → preguntas) solo se conservan para que no se pierdan al exportar.
// Aquí se convierte de un formato a otro para cargar, exportar e importar.

// ===== Oposición activa =====
// Cada oposición tiene su carpeta en oposiciones/ con sus preguntas (opo0001 → preg0001.json),
// lo añadido a ellas (preg0001-plus.json), images/... Las oposiciones disponibles están
// en oposiciones/oposiciones.json.
// Se elige con ?opo=opo0000 en la URL; si no se indica, la app muestra la lista para elegir.
const OPO = (new URLSearchParams(location.search).get('opo') || '').replace(/[^\w-]/g, '');
const CARPETA_OPO = 'oposiciones/' + OPO + '/';
const NOMBRE_PREGUNTAS = 'preg' + OPO.replace(/^opo/, '');
const ARCHIVO_PREGUNTAS = NOMBRE_PREGUNTAS + '.json';
const ARCHIVO_PLUS = NOMBRE_PREGUNTAS + '-plus.json';

// Lo guardado en el navegador va por separado para cada oposición: clave@opoXXXX
function claveDeOpo(clave) {
    const claveOpo = clave + '@' + OPO;
    // opo0001 usaba antes la clave sin sufijo: se copia una sola vez a la nueva
    try {
        const antigua = localStorage.getItem(clave);
        if (OPO === 'opo0001' && antigua !== null && localStorage.getItem(claveOpo) === null) {
            localStorage.setItem(claveOpo, antigua);
        }
    } catch (e) {}
    return claveOpo;
}

const CLAVE_NOTAS = claveDeOpo('notas-oposicion-ati');
const CLAVE_ASOCIACIONES = claveDeOpo('data/temario-asociaciones-ati');
const CLAVE_FICHAS = claveDeOpo('fichas-oposicion-ati');

const DIFICULTADES = ['Básico', 'Medio', 'Difícil'];

function leerDelNavegador(clave) {
    try { return JSON.parse(localStorage.getItem(clave)) || {}; }
    catch (e) { return {}; }
}

function ordenarClaves(a, b) {
    return Number(a) - Number(b) || a.localeCompare(b);
}

// Convierte lo escrito en una lista de tags: "#ley39 plazos" → ["#ley39", "#plazos"]
// (sin espacios, siempre con una sola almohadilla delante)
function normalizarTags(texto) {
    return String(texto).split(/\s+/)
        .map(t => t.replace(/^#+/, ''))
        .filter(Boolean)
        .map(t => '#' + t);
}

// Devuelve la URL completa si es válida (http/https), o null.
// Si falta el protocolo se añade https://: "www.boe.es" → "https://www.boe.es/"
function limpiarUrl(texto) {
    try {
        const url = new URL(/^[a-z]+:/i.test(texto) ? texto : 'https://' + texto);
        const valida = /^https?:$/.test(url.protocol) && url.hostname.includes('.');
        return valida ? url.href : null;
    } catch (e) {
        return null;
    }
}

// Texto corto para una URL: sin protocolo ni "www." y recortado
function textoCortoUrl(url) {
    const texto = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    return texto.length > 40 ? texto.slice(0, 39) + '…' : texto;
}

const ENLACE_MARKDOWN = /\[([^\]]*)\]\(([^)\s]+)\)/g;

// Lee un enlace guardado "[texto](url)" → { texto, url }
function leerEnlace(enlace) {
    const [, texto, url] = new RegExp(ENLACE_MARKDOWN.source).exec(enlace) || [];
    return { texto: texto || textoCortoUrl(url || ''), url: url || '' };
}

// Convierte lo escrito en una lista de enlaces en formato Markdown: "[texto](url)".
// Admite enlaces Markdown y URLs sueltas (que toman como texto su versión corta):
//   "[BOE](https://www.boe.es) www.inap.es" → ["[BOE](https://www.boe.es/)", "[inap.es](https://www.inap.es/)"]
function normalizarEnlaces(texto) {
    const enlaces = [];
    const sueltas = String(texto).replace(ENLACE_MARKDOWN, (_, titulo, direccion) => {
        const url = limpiarUrl(direccion);
        if (url) enlaces.push(`[${titulo.trim() || textoCortoUrl(url)}](${url})`);
        return ' ';
    });
    for (const palabra of sueltas.split(/\s+/).filter(Boolean)) {
        const url = limpiarUrl(palabra);
        if (url) enlaces.push(`[${textoCortoUrl(url)}](${url})`);
    }
    return enlaces;
}

// Campos de la ficha que son listas, con la función que limpia sus valores
const LISTAS_FICHA = { tags: normalizarTags, enlaces: normalizarEnlaces };

// Notas + asociaciones + fichas → preguntas-plus.
// Cada pregunta lleva siempre todos los campos, aunque estén vacíos.
function unirPreguntasPlus(notas, asociaciones, fichas) {
    const plus = {};
    const ficha = clave => plus[clave] = plus[clave] ||
        { nota: '', temas: [], tags: [], dificultad: null, enlaces: [] };
    for (const [clave, texto] of Object.entries(notas)) {
        if (texto && texto.trim()) ficha(clave).nota = texto;
    }
    for (const [tema, lista] of Object.entries(asociaciones)) {
        for (const clave of lista) ficha(String(clave)).temas.push(String(tema));
    }
    for (const [clave, datos] of Object.entries(fichas)) {
        for (const campo in LISTAS_FICHA) {
            if (datos[campo] && datos[campo].length) ficha(clave)[campo] = datos[campo];
        }
        if (datos.dificultad) ficha(clave).dificultad = datos.dificultad;
    }
    Object.values(plus).forEach(f => f.temas.sort(ordenarClaves));
    return plus;
}

// preguntas-plus → notas + asociaciones + fichas.
// También acepta los archivos antiguos (preguntas-notas.json y el de asociaciones).
function separarPreguntasPlus(datos) {
    const valores = Object.values(datos);
    if (valores.every(v => typeof v === 'string')) return { notas: datos, asociaciones: {}, fichas: {} };
    if (valores.every(Array.isArray)) return { notas: {}, asociaciones: datos, fichas: {} };

    const notas = {};
    const asociaciones = {};
    const fichas = {};
    for (const [clave, ficha] of Object.entries(datos)) {
        if (ficha.nota) notas[clave] = ficha.nota;
        for (const tema of ficha.temas || []) {
            (asociaciones[tema] = asociaciones[tema] || []).push(clave);
        }
        const limpia = {};
        for (const [campo, normalizar] of Object.entries(LISTAS_FICHA)) {
            const valores = normalizar((ficha[campo] || []).join(' '));
            if (valores.length) limpia[campo] = [...new Set(valores)];
        }
        if (DIFICULTADES.includes(ficha.dificultad)) limpia.dificultad = ficha.dificultad;
        if (Object.keys(limpia).length) fichas[clave] = limpia;
    }
    Object.values(asociaciones).forEach(lista => lista.sort(ordenarClaves));
    return { notas, asociaciones, fichas };
}

// Deja un preguntas-plus con todos los campos y los valores limpios
function normalizarPreguntasPlus(datos) {
    const s = separarPreguntasPlus(datos);
    return unirPreguntasPlus(s.notas, s.asociaciones, s.fichas);
}

// Última versión del pregNNNN-plus.json de la oposición que se aplicó en este navegador
const CLAVE_ARCHIVO = claveDeOpo('preguntas-plus-archivo');

// Cada vez que se abre la app se compara el pregNNNN-plus.json de la oposición con la última
// versión aplicada. Las preguntas que han cambiado en el archivo (por ejemplo,
// editadas a mano) se copian al navegador; el resto no se toca.
// La primera vez solo se rellena lo que falte, sin pisar lo ya guardado.
function cargarPreguntasPlus(raiz) {
    return fetch(raiz + CARPETA_OPO + ARCHIVO_PLUS, { cache: 'no-cache' })
        .then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        })
        .then(datos => {
            const archivo = normalizarPreguntasPlus(datos);
            let anterior = null;
            try { anterior = JSON.parse(localStorage.getItem(CLAVE_ARCHIVO)); } catch (e) {}
            // Se normaliza también para que un campo nuevo no haga parecer que todo ha cambiado
            if (anterior) anterior = normalizarPreguntasPlus(anterior);

            const guardado = {
                notas: leerDelNavegador(CLAVE_NOTAS),
                asociaciones: leerDelNavegador(CLAVE_ASOCIACIONES),
                fichas: leerDelNavegador(CLAVE_FICHAS)
            };
            for (const [clave, ficha] of Object.entries(archivo)) {
                if (!anterior) {
                    rellenarPregunta(guardado, clave, ficha);
                } else if (JSON.stringify(ficha) !== JSON.stringify(anterior[clave])) {
                    sustituirPregunta(guardado, clave, ficha);
                }
            }
            localStorage.setItem(CLAVE_NOTAS, JSON.stringify(guardado.notas));
            localStorage.setItem(CLAVE_ASOCIACIONES, JSON.stringify(guardado.asociaciones));
            localStorage.setItem(CLAVE_FICHAS, JSON.stringify(guardado.fichas));
            localStorage.setItem(CLAVE_ARCHIVO, JSON.stringify(archivo));
        })
        .catch(() => {});   // Si el archivo no existe, se sigue con lo guardado en el navegador
}

// Añade lo que el navegador aún no tenga de esta pregunta
function rellenarPregunta({ notas, asociaciones, fichas }, clave, ficha) {
    if (ficha.nota && !notas[clave]) notas[clave] = ficha.nota;
    for (const tema of ficha.temas) {
        const lista = asociaciones[tema] = asociaciones[tema] || [];
        if (!lista.includes(clave)) lista.push(clave);
        lista.sort(ordenarClaves);
    }
    const actual = fichas[clave] || {};
    for (const campo in LISTAS_FICHA) {
        const unidos = [...new Set([...(actual[campo] || []), ...ficha[campo]])];
        if (unidos.length) actual[campo] = unidos;
    }
    if (ficha.dificultad && !actual.dificultad) actual.dificultad = ficha.dificultad;
    if (Object.keys(actual).length) fichas[clave] = actual;
}

// Deja esta pregunta exactamente como viene en el archivo
function sustituirPregunta(guardado, clave, ficha) {
    delete guardado.notas[clave];
    delete guardado.fichas[clave];
    for (const [tema, lista] of Object.entries(guardado.asociaciones)) {
        const resto = lista.filter(c => c !== clave);
        if (resto.length) {
            guardado.asociaciones[tema] = resto;
        } else {
            delete guardado.asociaciones[tema];
        }
    }
    rellenarPregunta(guardado, clave, ficha);
}

function exportarPreguntasPlus() {
    const plus = unirPreguntasPlus(
        leerDelNavegador(CLAVE_NOTAS), leerDelNavegador(CLAVE_ASOCIACIONES), leerDelNavegador(CLAVE_FICHAS));
    const blob = new Blob([JSON.stringify(plus, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ARCHIVO_PLUS;
    a.click();
    URL.revokeObjectURL(a.href);
}

// Combina un archivo importado con lo guardado en el navegador:
// las notas y dificultades importadas sustituyen a las existentes,
// y los temas, tags y enlaces se suman sin duplicar.
function importarPreguntasPlus(datos) {
    const importado = separarPreguntasPlus(datos);
    const notas = { ...leerDelNavegador(CLAVE_NOTAS), ...importado.notas };
    const asociaciones = leerDelNavegador(CLAVE_ASOCIACIONES);
    for (const [tema, lista] of Object.entries(importado.asociaciones)) {
        const union = new Set([...(asociaciones[tema] || []), ...lista.map(String)]);
        asociaciones[tema] = [...union].sort(ordenarClaves);
    }
    const fichas = leerDelNavegador(CLAVE_FICHAS);
    for (const [clave, datos] of Object.entries(importado.fichas)) {
        const actual = fichas[clave] = fichas[clave] || {};
        for (const campo in LISTAS_FICHA) {
            if (datos[campo]) actual[campo] = [...new Set([...(actual[campo] || []), ...datos[campo]])];
        }
        if (datos.dificultad) actual.dificultad = datos.dificultad;
    }
    localStorage.setItem(CLAVE_NOTAS, JSON.stringify(notas));
    localStorage.setItem(CLAVE_ASOCIACIONES, JSON.stringify(asociaciones));
    localStorage.setItem(CLAVE_FICHAS, JSON.stringify(fichas));
}
