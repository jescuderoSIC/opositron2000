# opositron2000

Aplicación web para preparar oposiciones con exámenes tipo test de respuesta múltiple (cuatro opciones, una correcta). Admite varias oposiciones: al abrirla se elige con cuál trabajar.

Es una web estática (HTML, CSS y JavaScript, sin compilación ni base de datos): las preguntas están en ficheros JSON y lo que añade cada usuario se guarda en el navegador.

## Despliegue

La aplicación tiene que servirse desde un servidor web, porque carga los JSON con `fetch` y no funciona abriendo `index.html` directamente desde el disco.

Puede verse en línea en [https://jescuderosic.github.io/opositron2000/](https://jescuderosic.github.io/opositron2000/) (GitHub Pages).

Para ejecutarla en local, lo más rápido es el servidor web que trae Python, lanzado desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

y abrir [http://localhost:8000](http://localhost:8000).

## Uso

### Elegir oposición

Al abrir `index.html` aparece la lista de oposiciones de `oposiciones/oposiciones.json`. Al elegir una, la dirección pasa a ser `index.html?opo=opo0001`; esa dirección puede guardarse en marcadores para entrar directamente. El nombre de la oposición en la barra superior vuelve a la lista.

### Modo Examen

Pensado para hacer el examen de una vez:

- **Contestar**, **No contestar** o **Posponer** cada pregunta.
- Contadores de aciertos, fallos y puntos. Cada fallo resta 0,33.
- El progreso del examen no se guarda.

### Modo Estudio

Para repasar pregunta a pregunta. En cada pregunta se puede añadir:

- **Notas** en Markdown (negrita, listas, enlaces, imágenes…).
- **Dificultad**: Básico, Medio o Difícil.
- **Tags**, por ejemplo `#plazos`.
- **Enlaces**, en formato `[texto](url)` o como URL suelta.

Todo se guarda automáticamente en el navegador. Además:

- **Exportar notas** descarga `pregNNNN-plus.json` con todo lo añadido en esa oposición. Copiándolo en la carpeta de la oposición queda guardado en el repositorio.
- **Importar notas** carga un fichero exportado: las notas y dificultades importadas sustituyen a las existentes, y los tags y enlaces se suman.
- **Libro**: abre en otra pestaña los extras de la oposición (`webextra/index.html`).
- **Gemini** y **DeepSeek**: copian al portapapeles un prompt con la pregunta y abren el chat correspondiente para pegarlo.

El modo elegido (Examen o Estudio) se recuerda entre visitas.

## Estructura

```
opositron2000/
├── index.html              ← la aplicación (común a todas las oposiciones)
├── favicon.svg
├── css/style.css
├── js/
│   ├── preguntas-plus.js   ← oposición activa, nombres de ficheros, guardado, importar y exportar
│   └── script.js           ← elegir oposición, test, modos y notas
└── oposiciones/
    ├── oposiciones.json    ← lista de oposiciones disponibles
    ├── opo0000/            ← oposición de prueba (cultura general)
    ├── opo0001/            ← ATI 2025
    └── opo0002/            ← TI 2026
```

Cada oposición tiene su carpeta `oposiciones/opoNNNN/` con:

| Fichero | Obligatorio | Contenido |
|---|---|---|
| `pregNNNN.json` | Sí | Las preguntas del test. |
| `pregNNNN-plus.json` | No | Notas, tags, dificultad y enlaces de las preguntas. |
| `images/` | No | Imágenes que usan las notas. |
| `webextra/index.html` | No | Página de extras que abre el botón del libro. |
| `webextra/temarioNNNN.html` | No | Temario de la oposición, en una sola página HTML. |
| `webextra/bingoAzar75.html` | No | Bingo para elegir preguntas o temas al azar. |

### Formato de `pregNNNN.json`

Una lista de preguntas:

```json
[
  {
    "id": 1,
    "pregunta": "¿En qué año llegó Cristóbal Colón por primera vez a América?",
    "opciones": { "A": "1492", "B": "1512", "C": "1453", "D": "1498" },
    "respuesta_correcta": "A"
  }
]
```

- `id` identifica la pregunta: las notas se guardan con ese número. No tiene que ser correlativo; por ejemplo, las preguntas de reserva de `opo0002` son la 151 a la 157.
- El texto de la pregunta puede tener saltos de línea (`\n`) y sangrías, que se respetan; es útil para preguntas con código.

### Formato de `pregNNNN-plus.json`

Un objeto cuyas claves son los `id` de las preguntas:

```json
{
  "4": {
    "nota": "Julio César fue dictador; el primer emperador fue **Augusto**.",
    "temas": [],
    "tags": ["#roma", "#trampa"],
    "dificultad": "Medio",
    "enlaces": ["[WKP@Augusto](https://es.wikipedia.org/wiki/Augusto)"]
  }
}
```

- `dificultad` es `"Básico"`, `"Medio"`, `"Difícil"` o `null`.
- Las imágenes de las notas se escriben relativas a la carpeta de la oposición: `![Esquema](images/p073_01.png)`.
- Al abrir la aplicación se compara este fichero con la última versión aplicada en el navegador: las preguntas que han cambiado en el fichero (por ejemplo, editadas a mano) se copian al navegador, y el resto no se toca.

### Datos guardados en el navegador

Cada oposición guarda sus datos con claves propias, con el sufijo `@opoNNNN`: `notas-oposicion-ati@opo0001`, `fichas-oposicion-ati@opo0001`… Así no se mezclan aunque dos oposiciones tengan una pregunta con el mismo número. Los bingos también guardan su partida por oposición.

Lo guardado en el navegador solo existe en ese navegador: para conservarlo o pasarlo a otro equipo hay que usar **Exportar notas**.

## Añadir una oposición

1. **Elige un número libre** y crea su carpeta, por ejemplo `oposiciones/opo0003/`.

2. **Crea el fichero de preguntas** `oposiciones/opo0003/preg0003.json` con el formato descrito arriba. El número del nombre tiene que coincidir con el de la carpeta.

3. **Añádela a `oposiciones/oposiciones.json`**:

   ```json
   {
     "id": "opo0003",
     "nombre": "Nombre corto de la oposición",
     "descripcion": "Una línea que aparece bajo el nombre en la lista."
   }
   ```

   El `id` tiene que ser igual que el nombre de la carpeta.

4. **Opcional: extras**. Copia la carpeta `webextra/` de otra oposición y adáptala:
   - Renombra el temario a `temario0003.html`, cambia su contenido y actualiza el enlace en `webextra/index.html`.
   - En los `<title>` de las páginas, cambia el número: `opositron2000 - 0003 - …`.
   - En `bingoAzar75.html`, cambia las claves `CLAVE` y `CLAVE_TOTAL` al sufijo `@opo0003`, para que su partida no se mezcle con la de otra oposición, y `TOTAL_INICIAL` al número de preguntas.

5. **Opcional: notas iniciales**. Crea `preg0003-plus.json` si quieres que las preguntas lleguen con notas, tags o enlaces. Si no existe, la aplicación funciona igual.

6. **Prueba** `index.html?opo=opo0003` con el servidor local.

No hay que tocar el código de la aplicación.

## TO-DO

- Poner un modo shuffle para las opciones de respuesta en el modo Examen.
- Poner un contador de tiempo en el modo Examen.
- Hacer una página nube de tags/conceptos.

## Algunos PROMPTS

### Árbol semántico de Elon Musk

> Un ejemplo de lo que te voy a pedir para "la Constitución Española" con el formato que quiero (usa la flecha unicode) sería: 342.4(460)"1978" → 34: Derecho / Legislación. → 342: Derecho público / Derecho constitucional. → 342.4: Constituciones (leyes fundamentales de los Estados). → (460): Auxiliar común de lugar que representa a España. → "1978": Auxiliar común de tiempo que indica el año de promulgación.
> Dame el Código CDU Principal (Clasificación Decimal Universal) y su desglose jerárquico que más se aproxime al tema ...

### Definiciones cortas

> Dame una definición corta en un párrafo y de menos de 100 palabras de ...

## Algunas cuestiones EXTRA

- Para renderizar el Markdown en Visual Studio Code usa la combinación de teclas CTRL + SHIFT + V
- Para subir el contenido de este repositorio

```git
git add .
git commit -m "Subido contenido de Local Storage 261015"
git push
```
