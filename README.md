# opositron2000
Aplicación Web para la realización de exámenes multirrespuestas con una correcta


## Despliegue

Para correr la aplicación debe hacerse en un servidor web. 

Puede ver la aplicación de forma remota en [https://jescuderosic.github.io/opositron2000/](https://jescuderosic.github.io/opositron2000/).

Si quiere ejecutarla en su ordenador la forma más rápida es ejecutar el servidor web que viene por defecto en python

```python
python3 -m http.server 8000
```

## Examen y Estudio

El modo examen está pensado para hacer todo el examen de una vez, no se guarda el progreso.

El modo estudio guarda en formato markdown comentarios y asociaciones de preguntas con temas, primero en objetos localStorage, y cuando se ponen en su lugar adecuado en ficheros json.

## TO-DO

- Poner un modo shuffle para las opciones de respuesta en el modo Examen.
- Poner un contador de tiempo en el modo Examen.

## Algunos PROMPTS

### Árbol semántico de Elon Musk

> Un ejemplo de lo que te voy a pedir para "la Constitución Española" con el formato que quiero (usa la flecha unicode) sería: 342.4(460)"1978" → 34: Derecho / Legislación. → 342: Derecho público / Derecho constitucional. → 342.4: Constituciones (leyes fundamentales de los Estados). → (460): Auxiliar común de lugar que representa a España. → "1978": Auxiliar común de tiempo que indica el año de promulgación.
> Dame el Código CDU Principal (Clasificación Decimal Universal) y su desglose jerárquico que más se aproxime al tema ...

### Definiciones cortas

> Dame una definición corta en un párrafo y de menos de 100 palabras de ...


## Algunas cuestiones EXTRA
- Para renderizar el Markdown en Visual Studio Code usa la combinación de teclas CTRL + SHIFT + V
- 