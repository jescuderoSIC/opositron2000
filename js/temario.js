const markdownDisponible = typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined';

// Asociaciones guardadas en el navegador: { "21": ["7", "15"], ... } (tema → preguntas)
const CLAVE_ASOCIACIONES = 'data/temario-asociaciones-ati';

let temas = [];        // Lista plana de todos los temas, en orden
let bloques = [];
let preguntas = [];    // Se leen de preguntas.json solo para mostrarlas (no se modifican)
let asociaciones = cargarAsociaciones();
let indiceTema = -1;

// temario.html está dentro de la carpeta temario/, así que para llegar a la raíz
// del proyecto hay que subir un nivel. Todas las rutas de los datos (temario.json,
// imágenes de los .md...) se escriben desde la raíz del proyecto.
const RAIZ = '../';

function rutaDesdeRaiz(ruta) {
    // No se tocan las rutas absolutas, las web (http...) ni los anclajes (#...)
    if (!ruta || /^([a-z]+:|\/|#)/i.test(ruta)) return ruta;
    return RAIZ + ruta;
}

// Primera vez que se abre el temario en este navegador (no hay asociaciones guardadas):
// se cargan automáticamente las de data/asociaciones-temario-ati.json, si existe.
function cargarAsociacionesIniciales() {
    let yaHayAsociaciones = true;
    try { yaHayAsociaciones = localStorage.getItem(CLAVE_ASOCIACIONES) !== null; } catch (e) {}
    if (yaHayAsociaciones) return Promise.resolve();

    return fetch(RAIZ + 'data/asociaciones-temario-ati.json')
        .then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        })
        .then(iniciales => {
            asociaciones = iniciales;
            guardarAsociaciones();
        })
        .catch(() => {});   // Si el archivo no existe, se empieza sin asociaciones
}

Promise.all([
    fetch(RAIZ + 'data/temario.json').then(r => r.json()),
    fetch(RAIZ + 'data/preguntas.json').then(r => r.json()).catch(() => []),
    cargarAsociacionesIniciales()
])
    .then(([data, listaPreguntas]) => {
        preguntas = listaPreguntas;
        document.getElementById('titulo-temario').textContent = data.titulo || 'Temario';
        document.title = data.titulo || 'Temario';
        bloques = data.bloques || [];
        bloques.forEach(b => b.temas.forEach(t => temas.push(t)));
        pintarIndice('');
        abrirDesdeHash();
    })
    .catch(err => {
        console.error(err);
        document.getElementById('contenido').innerHTML =
            '<p class="aviso">No se pudo cargar <code>temario.json</code>.</p>';
    });

// temario.html#t21 abre directamente el tema 21
// temario.html#temario (o sin nada) muestra el temario completo
function abrirDesdeHash() {
    const pos = temas.findIndex(t => t.id === location.hash.slice(1));
    if (pos >= 0) {
        abrirTema(pos);
    } else {
        abrirTemarioCompleto();
    }
}

// ===== Asociaciones pregunta ↔ tema =====
function cargarAsociaciones() {
    try { return JSON.parse(localStorage.getItem(CLAVE_ASOCIACIONES)) || {}; }
    catch (e) { return {}; }
}

function guardarAsociaciones() {
    try { localStorage.setItem(CLAVE_ASOCIACIONES, JSON.stringify(asociaciones)); }
    catch (e) { alert('No se pudieron guardar las asociaciones.'); }
}

// Identificador de una pregunta: su "id" del JSON o, si no tiene, su posición
function claveDePregunta(p, i) {
    return String(p.id != null ? p.id : i + 1);
}

function buscarPregunta(clave) {
    const i = preguntas.findIndex((p, idx) => claveDePregunta(p, idx) === clave);
    return i >= 0 ? preguntas[i] : null;
}

function preguntasDelTema(numero) {
    return asociaciones[numero] || [];
}

function anadirPregunta(numeroTema, valor) {
    const clave = String(valor).trim();
    const error = document.getElementById('error-anadir');
    error.textContent = '';

    if (!clave) return;
    if (preguntas.length && !buscarPregunta(clave)) {
        error.textContent = `No existe la pregunta ${clave}.`;
        return;
    }
    const lista = asociaciones[numeroTema] || [];
    if (lista.includes(clave)) {
        error.textContent = `La pregunta ${clave} ya está asociada a este tema.`;
        return;
    }
    lista.push(clave);
    lista.sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
    asociaciones[numeroTema] = lista;
    guardarAsociaciones();
    refrescarTrasCambio();
}

function quitarPregunta(numeroTema, clave) {
    const lista = (asociaciones[numeroTema] || []).filter(c => c !== clave);
    if (lista.length) {
        asociaciones[numeroTema] = lista;
    } else {
        delete asociaciones[numeroTema];
    }
    guardarAsociaciones();
    refrescarTrasCambio();
}

function refrescarTrasCambio() {
    pintarIndice(document.getElementById('buscador').value);
    pintarRelacionadas();
}

// ===== Índice =====
function pintarIndice(filtro) {
    const nav = document.getElementById('indice');
    nav.innerHTML = '';
    const f = filtro.trim().toLowerCase();
    let hayResultados = false;

    // Entrada fija "TEMARIO": muestra el temario completo
    const general = document.createElement('div');
    general.className = 'tema-item item-temario' + (indiceTema === -1 ? ' active' : '');
    general.dataset.pos = -1;
    general.textContent = 'TEMARIO';
    general.onclick = abrirTemarioCompleto;
    nav.appendChild(general);

    bloques.forEach(bloque => {
        const visibles = bloque.temas.filter(t => !f ||
            t.titulo.toLowerCase().includes(f) ||
            (t.epigrafe || '').toLowerCase().includes(f) ||
            String(t.numero) === f);
        if (!visibles.length) return;
        hayResultados = true;

        const cab = document.createElement('div');
        cab.className = 'bloque-titulo';
        cab.textContent = bloque.nombre;
        nav.appendChild(cab);

        visibles.forEach(tema => {
            const pos = temas.indexOf(tema);
            const item = document.createElement('div');
            item.className = 'tema-item' + (pos === indiceTema ? ' active' : '');
            item.dataset.pos = pos;
            item.title = tema.epigrafe || tema.titulo;

            const total = preguntasDelTema(tema.numero).length;
            if (total) {
                const contador = document.createElement('span');
                contador.className = 'contador-preguntas';
                contador.title = `${total} pregunta(s) asociada(s)`;
                contador.textContent = total;
                item.appendChild(contador);
            }

            const num = document.createElement('span');
            num.className = 'tema-num';
            num.textContent = `${tema.numero ?? pos + 1}.`;
            item.appendChild(num);
            item.appendChild(document.createTextNode(tema.titulo));

            item.onclick = () => abrirTema(pos);
            nav.appendChild(item);
        });
    });

    if (!hayResultados) {
        const aviso = document.createElement('div');
        aviso.className = 'sin-resultados';
        aviso.textContent = 'Ningún tema coincide.';
        nav.appendChild(aviso);
    }
}

// ===== Contenido del tema =====
function abrirTema(pos) {
    if (pos < 0 || pos >= temas.length) return;
    indiceTema = pos;
    const tema = temas[pos];

    history.replaceState(null, '', '#' + tema.id);
    document.querySelectorAll('.tema-item').forEach(el =>
        el.classList.toggle('active', Number(el.dataset.pos) === pos));
    document.getElementById('posicion').textContent = `Tema ${tema.numero ?? pos + 1} de ${temas.length}`;
    document.getElementById('btn-anterior').disabled = false;
    document.getElementById('btn-siguiente').disabled = pos === temas.length - 1;

    const contenido = document.getElementById('contenido');
    contenido.scrollTop = 0;
    contenido.innerHTML = '';

    // Cabecera: título, epígrafe oficial y preguntas asociadas
    const cabecera = document.createElement('header');
    cabecera.className = 'tema-cabecera';
    const h1 = document.createElement('h1');
    h1.textContent = `Tema ${tema.numero ?? pos + 1}. ${tema.titulo}`;
    cabecera.appendChild(h1);
    if (tema.epigrafe) {
        const ep = document.createElement('div');
        ep.className = 'epigrafe';
        ep.textContent = tema.epigrafe;
        cabecera.appendChild(ep);
    }
    const rel = document.createElement('section');
    rel.id = 'relacionadas';
    rel.className = 'relacionadas';
    cabecera.appendChild(rel);

    const cuerpo = document.createElement('div');
    cuerpo.id = 'cuerpo-tema';
    cuerpo.innerHTML = '<p class="aviso">Cargando...</p>';

    contenido.append(cabecera, cuerpo);
    pintarRelacionadas();

    fetch(rutaDesdeRaiz(tema.archivo))
        .then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.text();
        })
        .then(texto => mostrarContenido(cuerpo, texto))
        .catch(() => {
            cuerpo.innerHTML = '<p class="aviso">Este tema todavía no tiene contenido. Crea el archivo <code></code> para añadirlo.</p>';
            cuerpo.querySelector('code').textContent = tema.archivo;
        });
}

// ===== Temario completo =====
// Divide un epígrafe en sus apartados (cada frase terminada en punto)
function apartadosDe(epigrafe) {
    return (epigrafe || '')
        .split(/\.\s+/)
        .map(a => a.trim().replace(/\.$/, ''))
        .filter(Boolean);
}

function abrirTemarioCompleto() {
    indiceTema = -1;
    history.replaceState(null, '', '#temario');
    document.querySelectorAll('.tema-item').forEach(el =>
        el.classList.toggle('active', Number(el.dataset.pos) === -1));
    document.getElementById('posicion').textContent = `Temario completo · ${temas.length} temas`;
    document.getElementById('btn-anterior').disabled = true;
    document.getElementById('btn-siguiente').disabled = temas.length === 0;

    const contenido = document.getElementById('contenido');
    contenido.scrollTop = 0;
    contenido.innerHTML = '';
    contenido.classList.remove('texto-plano');

    const h1 = document.createElement('h1');
    h1.className = 'temario-completo-titulo';
    h1.textContent = document.getElementById('titulo-temario').textContent;
    contenido.appendChild(h1);

    bloques.forEach(bloque => {
        const h2 = document.createElement('h2');
        h2.className = 'temario-bloque';
        h2.textContent = bloque.nombre;
        contenido.appendChild(h2);

        bloque.temas.forEach(tema => {
            const pos = temas.indexOf(tema);
            const seccion = document.createElement('section');
            seccion.className = 'temario-tema';

            const h3 = document.createElement('h3');
            const enlace = document.createElement('a');
            enlace.href = '#' + tema.id;   // el cambio de dirección abre el tema
            enlace.textContent = `Tema ${tema.numero ?? pos + 1}. ${tema.titulo}`;
            h3.appendChild(enlace);
            seccion.appendChild(h3);

            const apartados = apartadosDe(tema.epigrafe);
            if (apartados.length) {
                const ul = document.createElement('ul');
                apartados.forEach(a => {
                    const li = document.createElement('li');
                    li.textContent = a;
                    ul.appendChild(li);
                });
                seccion.appendChild(ul);
            }
            contenido.appendChild(seccion);
        });
    });
}

function pintarRelacionadas() {
    const rel = document.getElementById('relacionadas');
    if (!rel || indiceTema < 0) return;
    const numeroTema = temas[indiceTema].numero;
    const lista = preguntasDelTema(numeroTema);
    rel.innerHTML = '';

    const h2 = document.createElement('h2');
    h2.textContent = `Preguntas asociadas (${lista.length})`;
    rel.appendChild(h2);

    lista.forEach(clave => rel.appendChild(crearFichaPregunta(numeroTema, clave)));

    // Formulario para añadir una pregunta
    const form = document.createElement('div');
    form.className = 'anadir-pregunta';
    form.innerHTML = `
        <label for="input-pregunta">Añadir pregunta nº</label>
        <input type="number" id="input-pregunta" min="1">
        <button type="button" id="btn-anadir">Añadir</button>
        <span id="error-anadir" class="mensaje-error"></span>`;
    rel.appendChild(form);

    const input = form.querySelector('#input-pregunta');
    const anadir = () => { anadirPregunta(numeroTema, input.value); };
    form.querySelector('#btn-anadir').onclick = anadir;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') anadir(); });
}

// Ficha desplegable con el enunciado, las opciones y la respuesta correcta
function crearFichaPregunta(numeroTema, clave) {
    const p = buscarPregunta(clave);
    const ficha = document.createElement('details');
    ficha.className = 'pregunta-asociada';

    const summary = document.createElement('summary');
    const num = document.createElement('span');
    num.className = 'pregunta-num';
    num.textContent = `Pregunta ${clave}`;
    const resumen = document.createElement('span');
    resumen.className = 'pregunta-resumen';
    resumen.textContent = p ? p.pregunta : '(no encontrada en preguntas.json)';
    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'btn-quitar';
    quitar.title = 'Quitar de este tema';
    quitar.textContent = '✕';
    quitar.onclick = e => {
        e.preventDefault();   // que no se despliegue la ficha al pulsar
        quitarPregunta(numeroTema, clave);
    };
    summary.append(num, resumen, quitar);
    ficha.appendChild(summary);

    if (p) {
        const detalle = document.createElement('div');
        detalle.className = 'pregunta-detalle';
        const enunciado = document.createElement('p');
        enunciado.textContent = p.pregunta;
        const ul = document.createElement('ul');
        Object.entries(p.opciones || {}).forEach(([letra, texto]) => {
            const li = document.createElement('li');
            li.textContent = `${letra}. ${texto}`;
            if (letra === p.respuesta_correcta) li.className = 'correcta';
            ul.appendChild(li);
        });
        detalle.append(enunciado, ul);
        ficha.appendChild(detalle);
    }
    return ficha;
}

function mostrarContenido(cuerpo, texto) {
    if (markdownDisponible) {
        cuerpo.classList.remove('texto-plano');
        cuerpo.innerHTML = DOMPurify.sanitize(marked.parse(texto));
        // Las imágenes y enlaces de los .md se escriben desde la raíz del proyecto
        cuerpo.querySelectorAll('img[src]').forEach(img =>
            img.setAttribute('src', rutaDesdeRaiz(img.getAttribute('src'))));
        cuerpo.querySelectorAll('a[href]').forEach(a =>
            a.setAttribute('href', rutaDesdeRaiz(a.getAttribute('href'))));
    } else {
        cuerpo.classList.add('texto-plano');
        cuerpo.textContent = texto;
    }
}

// ===== Exportar / importar asociaciones =====
document.getElementById('btn-exportar').onclick = () => {
    const blob = new Blob([JSON.stringify(asociaciones, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'asociaciones-temario-ati.json';
    a.click();
    URL.revokeObjectURL(a.href);
};

document.getElementById('btn-importar').onclick = () =>
    document.getElementById('archivo-importar').click();

document.getElementById('archivo-importar').onchange = event => {
    const archivo = event.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
        try {
            const importadas = JSON.parse(lector.result);
            // Se combinan con las existentes, sin duplicar preguntas
            for (const [tema, lista] of Object.entries(importadas)) {
                const union = new Set([...(asociaciones[tema] || []), ...lista.map(String)]);
                asociaciones[tema] = [...union].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
            }
            guardarAsociaciones();
            refrescarTrasCambio();
            alert('Asociaciones importadas correctamente.');
        } catch (e) {
            alert('El archivo no es válido.');
        }
    };
    lector.readAsText(archivo);
    event.target.value = '';
};

// ===== Navegación =====
function irAnterior() {
    if (indiceTema === 0) {
        abrirTemarioCompleto();
    } else {
        abrirTema(indiceTema - 1);
    }
}

document.getElementById('btn-anterior').onclick = irAnterior;
document.getElementById('btn-siguiente').onclick = () => abrirTema(indiceTema + 1);
document.getElementById('buscador').addEventListener('input', e => pintarIndice(e.target.value));
window.addEventListener('hashchange', abrirDesdeHash);

// Flechas del teclado (si no se está escribiendo en un campo)
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') irAnterior();
    if (e.key === 'ArrowRight') abrirTema(indiceTema + 1);
});
