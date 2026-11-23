# Jade celestial

Reconstrucción generativa por piezas de la referencia aprobada, usando ImageGen integrado. No es extracción exacta. Los prompts están en generation-notes.json y los hashes de archivos activos en provenance.json.

- head: cabeza sin boca ni dientes y dos huecos oculares transparentes.
- eye-dark: respaldo oscuro fijo; sclera: fondo marfil fijo; iris: solo iris/pupila móvil.
- lid-upper/lower: cortinas independientes. El recorte ocular usa la transparencia de la cabeza.
- torso: cuello y espiral continuos, con movimiento variable por zonas sobre malla24x24.
- wing-left/right y tail-tip: piezas adicionales con movimiento propio y campo continuo compartido.
- mouth-back/mouth: cavidad sólida; jaw/fangs/tongue/lower-teeth: capas articuladas independientes.

No recortar los lienzos al editar/upscale; conservar UV/alpha. Export de piezas con nombres de rig en art/avatar-parts/jade-dragon. Los PNG eye-left/eye-right originales son intentos de ojo compuesto descartados, no se cargan ni exportan; el manifest activo utiliza iris.png y sclera.png por separado.
