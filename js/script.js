let preguntas = [];
let indiceActual = 0;
let seleccionActual = null;
let estadoRespuestas = [];
let aciertos = 0;
let fallos = 0;

// ===== NOTAS =====
const CLAVE_NOTAS = 'notas-oposicion-ati';
let notas = cargarNotasGuardadas();
let temporizadorGuardado = null;

function cargarNotasGuardadas() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_NOTAS)) || {};
    } catch (e) {
        return {};
    }
}

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
});

function exportarNotas() {
    const blob = new Blob([JSON.stringify(notas, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mis-notas-ati.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

function importarNotas(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
        try {
            const importadas = JSON.parse(lector.result);
            notas = { ...notas, ...importadas };
            guardarNotas();
            cargarPregunta(indiceActual);
            alert('Notas importadas correctamente.');
        } catch (e) {
            alert('El archivo no es válido.');
        }
    };
    lector.readAsText(archivo);
    event.target.value = '';
}

// Primera vez que se abre la app en este navegador (no hay notas guardadas):
// se cargan automáticamente las de data/mis-notas-ati.json, si existe.
function cargarNotasIniciales() {
    let yaHayNotas = true;
    try { yaHayNotas = localStorage.getItem(CLAVE_NOTAS) !== null; } catch (e) {}
    if (yaHayNotas) return Promise.resolve();

    return fetch('data/mis-notas-ati.json')
        .then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        })
        .then(iniciales => {
            notas = iniciales;
            localStorage.setItem(CLAVE_NOTAS, JSON.stringify(notas));
        })
        .catch(() => {});   // Si el archivo no existe, se empieza sin notas
}

Promise.all([
    fetch('data/preguntas.json').then(response => response.json()),
    cargarNotasIniciales()
])
    .then(([data]) => {
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
