# Accesorios editables

Esta es la carpeta fuente. Los SVG y PNG mantienen transparencia; no requieren ImageGen ni dependencias externas. El programa copia esta carpeta a `wwwroot/accessories` junto al ejecutable al compilar/publicar. En una copia portable, edita esa carpeta directamente. En el proyecto, edita esta carpeta y reinicia con el lanzador para compilar/copiar los cambios.

Para cambiar el aspecto, edita el SVG existente en Inkscape u otro editor. Conserva su viewBox y márgenes para mantener el encaje. Puedes sustituirlo por un PNG transparente y cambiar `file` en el catálogo.

Para añadir una variante, copia una entrada de `catalog.json`, asigna `id` único, `value` único dentro de la categoría, `label` y nombre `file` (solo letras minúsculas, números y guiones, extensión svg/png, sin rutas). Copia el archivo a esta carpeta. Máximo 32 entradas. Las categorías son `accessoryGlasses`, `accessoryHat`, `accessoryNecklace` y `accessoryObject`.

`node` define el anclaje: `head` para lentes/sombreros, `torso` para collares, `root` para objetos. `rect` es [x, y, ancho, alto] sobre el lienzo lógico 1536×1024 del dragón actual, independiente de la resolución HD de Streamlabs. El editor del panel permite afinar el encaje sin editar el catálogo.

El ajuste se guarda en la configuración por fuente, modelo de Puppet e ID de accesorio. No renombres ni borres una variante mientras siga seleccionada: elige Ninguno primero. Conserva una copia de tus archivos personalizados antes de actualizar la aplicación.

Micrófono: el idle (quieto, flotación o flotación/balanceo), velocidad e intensidad se configuran en Ajustar accesorios. Su prueba anima solo el objeto; el Puppet sigue en reposo. Cancelar descarta el borrador y Aplicar lo guarda y transmite a la fuente.

Dos objetos: Objeto izquierdo y Objeto derecho usan el mismo catálogo accessoryObject y pueden seleccionar el mismo archivo simultáneamente. Izquierda/derecha se refiere a la pantalla. Cada lado tiene ajuste e idle independientes. El objeto único anterior conserva su identidad y ajustes en la derecha; la izquierda empieza en Ninguno. Para añadir objetos basta una entrada de catálogo: se ofrece en ambos lados, sin duplicar el SVG/PNG.
