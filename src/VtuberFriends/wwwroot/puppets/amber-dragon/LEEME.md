# Ámbar · Puppet 2D

Reconstrucción generativa de la referencia aprobada; no extracción exacta. Conserva rostro redondo amistoso, hocico crema entero y torso ancho. Sin lentes incorporados: se eligen como accesorio. Prompts de ImageGen en generation-notes.json y hashes de PNG en provenance.json.

- head.png contiene cabeza completa, nariz y hocico intacto, sin boca, dientes ni cejas pintados.
- iris.png es solo iris/pupila redonda; sclera.png fondo fijo. Ambos separados de eye-dark y de los párpados.
- lid-upper/lower.png cierran como cortinas sobre la órbita, con máscara de la cabeza. El render elimina residuos de alpha y usa material opaco para los párpados.
- brow.png se instancia como ceja izquierda/derecha en nodos independientes. Responde a expresión, mirada y voz; no forma parte de la imagen de cabeza.
- torso y alas son específicos de Ámbar y no reutilizan la silueta de Cian.
- No existe capa ni nodo jaw. La boca es una superficie geométrica delante del hocico: sus dos bordes se interpolan continuamente con MouthOpen/MouthForm. El interior es opaco; tongue es una segunda capa geométrica rosa recortada a la abertura. No hay agujero en la cabeza.
- fang.png se instancia dos veces; cada diente sigue el borde superior de la boca.

La exportación limpia está en art/avatar-parts/amber-dragon. mouth.svg y tongue.svg del export representan muestras de material, no la forma final animada: esa forma la define surface-mouth.js y el shader. Mantener alpha, dimensiones y márgenes al editar/upscale.

Los ajustes de sensibilidad, apertura máxima, expresión, accesorios y fuentes HD se reutilizan. Elige Ámbar en el selector tras reiniciar el receptor; no se reasignan usuarios automáticamente.

Revisión: activos head-v2.png y torso-v2.png, mentón más definido y pecho más estrecho según referencia. Boca geométrica aprobada sin cambios. Pupilas centradas sobre las nuevas órbitas y recorrido de mirada reducido. Prompts en reference-revision-notes.json.
