# opositron2000
Aplicación Web para la realización de exámenes multirrespuestas con una correcta


## Servidor Web
Para correr la aplicación debe hacerse en un servidor web, la forma más rápida es ejecutar el que viene por defecto en python

```python
python3 -m http.server 8000
```

## Examen y Estudio

El modo examen está pensado para hacer todo el examen de una vez, no se guarda el progreso.

El modo estudio guarda en formato markdown comentarios y asociaciones de preguntas con temas, primero en objetos localStorage, y cuando se ponen en su lugar adecuado en ficheros json.

