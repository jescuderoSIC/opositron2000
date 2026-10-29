let preguntas = [];
let indiceActual = 0;
let seleccionActual = null;
let estadoRespuestas = [];
let aciertos = 0;
let fallos = 0;

// ===== NOTAS =====
// (CLAVE_NOTAS y la carga/exportación del archivo están en preguntas-plus.js)
let notas = leerDelNavegador(CLAVE_NOTAS);
let temporizadorGuardado = null;

function guardarNotas() {
    try {
        localStorage.setItem(CLAVE_NOTAS, JSON.stringify(notas));
        mostrarEstadoNota('Guardado');
    } catch (e) {
        mostrarEstadoNota('Error al guardar');
    }
}

// Identificador estable de cada pregunta (usa su id del JSON si existe)
function claveNota(index) {
    const p = preguntas[index];
    return String(p && p.id != null ? p.id : index + 1);
}

function mostrarEstadoNota(texto) {
    const el = document.getElementById('nota-estado');
    el.innerText = texto;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.innerText = '', 1500);
}

// ===== DIFICULTAD, TAGS Y ENLACES =====
// Por pregunta: { "28": { "tags": ["#plazos"], "dificultad": "Medio", "enlaces": ["https://..."] } }
let fichas = leerDelNavegador(CLAVE_FICHAS);

function guardarFichas() {
    try {
        localStorage.setItem(CLAVE_FICHAS, JSON.stringify(fichas));
        mostrarEstadoNota('Guardado');
    } catch (e) {
        mostrarEstadoNota('Error al guardar');
    }
}

function fichaActual() {
    return fichas[claveNota(indiceActual)] || {};
}

function actualizarFicha(cambios) {
    const clave = claveNota(indiceActual);
    const ficha = { ...fichaActual(), ...cambios };
    for (const campo in LISTAS_FICHA) {
        if (!ficha[campo] || !ficha[campo].length) delete ficha[campo];
    }
    if (!ficha.dificultad) delete ficha.dificultad;
    if (Object.keys(ficha).length) {
        fichas[clave] = ficha;
    } else {
        delete fichas[clave];
    }
    guardarFichas();
    renderizarFicha();
}

// Pulsar el nivel que ya está marcado lo desmarca
function cambiarDificultad(nivel) {
    actualizarFicha({ dificultad: fichaActual().dificultad === nivel ? null : nivel });
}

// campo: 'tags' o 'enlaces' (ver LISTAS_FICHA)
function anadirALista(campo, texto) {
    const actuales = fichaActual()[campo] || [];
    actualizarFicha({ [campo]: [...new Set([...actuales, ...LISTAS_FICHA[campo](texto)])] });
}

function quitarDeLista(campo, valor) {
    actualizarFicha({ [campo]: (fichaActual()[campo] || []).filter(v => v !== valor) });
}

// Pinta cada valor de la lista como una etiqueta con su botón × para quitarlo
function pintarLista(campo, idContenedor, crearContenido) {
    const lista = document.getElementById(idContenedor);
    lista.innerHTML = '';
    (fichaActual()[campo] || []).forEach(valor => {
        const chip = document.createElement('span');
        chip.className = 'tag';
        chip.appendChild(crearContenido(valor));
        const quitar = document.createElement('button');
        quitar.type = 'button';
        quitar.textContent = '×';
        quitar.title = `Quitar ${chip.textContent}`;
        quitar.onclick = () => quitarDeLista(campo, valor);
        chip.appendChild(quitar);
        lista.appendChild(chip);
    });
}

function renderizarFicha() {
    const { dificultad } = fichaActual();
    document.querySelectorAll('#selector-dificultad button').forEach(b =>
        b.classList.toggle('activo', b.dataset.dificultad === dificultad));

    // La almohadilla del tag no se muestra
    pintarLista('tags', 'lista-tags', tag => document.createTextNode(tag.slice(1)));

    // Los enlaces se guardan en Markdown "[texto](url)" y se muestra el texto
    pintarLista('enlaces', 'lista-enlaces', enlace => {
        const { texto, url } = leerEnlace(enlace);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = url;
        a.textContent = texto;
        return a;
    });
}

// ===== MARKDOWN =====
// Solo se usa Markdown si cargaron marked (conversor) y DOMPurify (seguridad).
// Si alguna falla (sin internet, CDN bloqueado...), se muestra texto plano.
const markdownDisponible = typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined';

function renderizarNota(texto) {
    const vista = document.getElementById('nota-vista');
    if (!texto.trim()) {
        vista.innerHTML = '<p class="nota-vacia">Sin notas. Pulsa «Editar» para añadir una.</p>';
        return;
    }
    if (markdownDisponible) {
        vista.classList.remove('texto-plano');
        vista.innerHTML = DOMPurify.sanitize(marked.parse(texto, { breaks: true }));
    } else {
        vista.classList.add('texto-plano');
        vista.textContent = texto;
    }
}

let editandoNota = false;

function alternarEdicion() {
    editandoNota = !editandoNota;
    const textarea = document.getElementById('nota-texto');
    const vista = document.getElementById('nota-vista');
    textarea.hidden = !editandoNota;
    vista.hidden = editandoNota;
    document.getElementById('btn-editar-nota').innerText = editandoNota ? 'Vista previa' : 'Editar';
    if (editandoNota) {
        textarea.focus();
    } else {
        renderizarNota(textarea.value);
    }
}

// ===== MODOS =====
const CLAVE_MODO = 'modo-oposicion-ati';
let modoActual = 'examen';

function cambiarModo(modo) {
    modoActual = modo;
    document.body.classList.toggle('modo-examen', modo === 'examen');
    document.body.classList.toggle('modo-estudio', modo === 'estudio');
    document.getElementById('btn-modo-examen').classList.toggle('activo', modo === 'examen');
    document.getElementById('btn-modo-estudio').classList.toggle('activo', modo === 'estudio');
    try { localStorage.setItem(CLAVE_MODO, modo); } catch (e) {}
    if (preguntas.length) cargarPregunta(indiceActual);
}

document.addEventListener('DOMContentLoaded', () => {
    let modoGuardado = 'examen';
    try { modoGuardado = localStorage.getItem(CLAVE_MODO) || 'examen'; } catch (e) {}
    cambiarModo(modoGuardado);

    document.getElementById('markdown-aviso').innerText =
        markdownDisponible ? '(admite Markdown)' : '(texto plano: Markdown no disponible)';

    const textarea = document.getElementById('nota-texto');
    textarea.addEventListener('input', () => {
        const clave = claveNota(indiceActual);
        const texto = textarea.value;
        if (texto.trim()) {
            notas[clave] = texto;
        } else {
            delete notas[clave];
        }
        actualizarSidebarVisual();
        clearTimeout(temporizadorGuardado);
        temporizadorGuardado = setTimeout(guardarNotas, 500);
    });

    // Casillas de tags y enlaces: Intro añade lo escrito.
    // Si no hay nada válido (p. ej. una URL mal escrita) el texto se deja para corregirlo.
    [['nuevo-tag', 'tags'], ['nuevo-enlace', 'enlaces']].forEach(([id, campo]) => {
        const casilla = document.getElementById(id);
        casilla.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (!LISTAS_FICHA[campo](casilla.value).length) {
                mostrarEstadoNota(campo === 'enlaces' ? 'Enlace no válido' : 'Tag vacío');
                return;
            }
            anadirALista(campo, casilla.value);
            casilla.value = '';
        });
    });
});

// Guarda ya la nota que se esté escribiendo, sin esperar al temporizador
function guardarNotasPendientes() {
    clearTimeout(temporizadorGuardado);
    guardarNotas();
}

// Exporta preguntas-plus.json: notas y también temas asociados a cada pregunta
function exportarNotas() {
    guardarNotasPendientes();
    exportarPreguntasPlus();
}

function importarNotas(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
        try {
            guardarNotasPendientes();
            importarPreguntasPlus(JSON.parse(lector.result));
            notas = leerDelNavegador(CLAVE_NOTAS);
            fichas = leerDelNavegador(CLAVE_FICHAS);
            cargarPregunta(indiceActual);
            alert('Notas importadas correctamente.');
        } catch (e) {
            alert('El archivo no es válido.');
        }
    };
    lector.readAsText(archivo);
    event.target.value = '';
}

Promise.all([
    fetch('data/preguntas.json').then(response => response.json()),
    cargarPreguntasPlus('')
])
    .then(([data]) => {
        notas = leerDelNavegador(CLAVE_NOTAS);
        fichas = leerDelNavegador(CLAVE_FICHAS);
        preguntas = data;
        estadoRespuestas = new Array(preguntas.length).fill(null);
        renderizarSidebar();
        cargarPregunta(0);
    })
    .catch(error => console.error("Error cargando JSON:", error));

function cargarPregunta(index) {
    if (index < 0 || index >= preguntas.length) return;
    
    indiceActual = index;
    seleccionActual = null;
    const pregunta = preguntas[index];

    document.getElementById('q-counter').innerText = `${index + 1}/${preguntas.length}`;
    document.getElementById('question-text').innerText = pregunta.pregunta;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    for (const [letra, texto] of Object.entries(pregunta.opciones)) {
        const label = document.createElement('label');
        label.className = 'option-label';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'respuesta';
        radio.value = letra;
        
        radio.onclick = () => {
            seleccionActual = letra;
            document.querySelectorAll('.option-label').forEach(el => el.classList.remove('selected'));
            label.classList.add('selected');
        };

        // En modo Estudio se resalta la respuesta correcta
        if (modoActual === 'estudio' && letra === pregunta.respuesta_correcta) {
            label.classList.add('correcta');
        }

        label.appendChild(radio);
        label.appendChild(document.createTextNode(` ${letra}. ${texto}`));
        optionsContainer.appendChild(label);
    }

    // Cargar la nota de esta pregunta
    const textoNota = notas[claveNota(index)] || '';
    document.getElementById('nota-texto').value = textoNota;
    renderizarNota(textoNota);
    renderizarFicha();

    actualizarSidebarVisual();
}

function renderizarSidebar() {
    const sidebar = document.getElementById('sidebar-list');
    sidebar.innerHTML = '';
    
    preguntas.forEach((_, index) => {
        const div = document.createElement('div');
        div.className = 'sidebar-item';
        div.innerText = `Escoger ${index + 1}`;
        div.onclick = () => cargarPregunta(index);
        sidebar.appendChild(div);
    });
}

function actualizarSidebarVisual() {
    const items = document.querySelectorAll('.sidebar-item');
    items.forEach((item, index) => {
        item.classList.toggle('active', index === indiceActual);
        item.classList.toggle('con-nota', !!notas[claveNota(index)]);
    });
}

function actualizarEstadisticas() {
    document.getElementById('q-aciertos').innerText = aciertos;
    document.getElementById('q-fallos').innerText = fallos;
    let puntos = aciertos - (fallos * 0.33);
    document.getElementById('q-puntos').innerText = puntos > 0 ? puntos.toFixed(2) : 0;
}

function contestar() {
    if (!seleccionActual) {
        alert("Por favor, selecciona una opción antes de contestar.");
        return;
    }

    const respuestaCorrecta = preguntas[indiceActual].respuesta_correcta;
    
    if (estadoRespuestas[indiceActual] === null) {
        if (seleccionActual === respuestaCorrecta) {
            aciertos++;
            estadoRespuestas[indiceActual] = 'acierto';
        } else {
            fallos++;
            estadoRespuestas[indiceActual] = 'fallo';
        }
        actualizarEstadisticas();
    }
    avanzarPregunta();
}

function posponer() {
    avanzarPregunta();
}

function noContestar() {
    if (estadoRespuestas[indiceActual] === null) {
        estadoRespuestas[indiceActual] = 'blanco';
    }
    avanzarPregunta();
}

function avanzarPregunta() {
    if (indiceActual < preguntas.length - 1) {
        cargarPregunta(indiceActual + 1);
    } else {
        alert("¡Has llegado al final del cuestionario!");
    }
}

async function consultarGemini() {
    const preguntaActual = preguntas[indiceActual];
    if (!preguntaActual) return;

    const numeroPregunta = preguntaActual.id || (indiceActual + 1);

    let opcionesTexto = "";
    for (const [letra, texto] of Object.entries(preguntaActual.opciones)) {
        opcionesTexto += `- Opción ${letra}: ${texto}\n`;
    }

    // Prompt optimizado para pegar en un mismo chat continuo
    const prompt = `[CUESTIÓN DE OPOSICIÓN ATI - PREGUNTA ${numeroPregunta}]

Pregunta: "${preguntaActual.pregunta}"

Opciones:
${opcionesTexto}
Respuesta correcta (plantilla oficial): Opción ${preguntaActual.respuesta_correcta}.

Analiza esta pregunta manteniendo el contexto de la oposición:
1. Explica detalladamente por qué la opción ${preguntaActual.respuesta_correcta} es la correcta.
2. Justifica brevemente por qué cada una de las otras opciones es incorrecta o no aplica.
3. Identifica el concepto clave a memorizar y qué otros conceptos son similares o se suelen confundir con él.
4. Proporciona referencias, recursos normativos, leyes, artículos o documentación técnica oficial.`;

    try {
        await navigator.clipboard.writeText(prompt);
        window.open('https://gemini.google.com/app', '_blank');
    } catch (err) {
        console.error('Error al copiar al portapapeles: ', err);
        alert('No se pudo copiar automáticamente.');
    }
}
async function consultarDeepSeek() {
    const preguntaActual = preguntas[indiceActual];
    if (!preguntaActual) return;

    const numeroPregunta = preguntaActual.id || (indiceActual + 1);

    let opcionesTexto = "";
    for (const [letra, texto] of Object.entries(preguntaActual.opciones)) {
        opcionesTexto += `- Opción ${letra}: ${texto}\n`;
    }

    const prompt = `[CONCEPTOS - OPOSICIÓN ATI - PREGUNTA ${numeroPregunta}]

Pregunta: "${preguntaActual.pregunta}"

Opciones:
${opcionesTexto}
Extrae todos los conceptos técnicos, normativos o administrativos que aparecen en el enunciado y en las opciones de esta pregunta (términos, siglas, tecnologías, leyes, órganos, procedimientos, etc.).

Para cada concepto, da una definición breve (1-2 frases), clara y precisa, orientada a una oposición. Si es una sigla, indica también su significado completo.

Presenta el resultado como una lista en formato Markdown, con el concepto en negrita seguido de su definición, para poder copiarlo directamente a mis apuntes.`;

    try {
        await navigator.clipboard.writeText(prompt);
        window.open('https://chat.deepseek.com/', '_blank');
    } catch (err) {
        console.error('Error al copiar al portapapeles: ', err);
        alert('No se pudo copiar automáticamente.');
    }
}
