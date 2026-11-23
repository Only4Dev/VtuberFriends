# Prompts de la revision de boca y parpados
Herramienta: ImageGen integrada. Todas las salidas con transparencia; PNG originales preservados. Referencia de usuario: primer plano del hocico dentado del 19 de noviembre.

- Cada uno de los cuatro parpados: editar exclusivamente el ornamento cyan/turquesa convirtiendolo al mismo material obsidiana de la piel; conservar silueta, sombreado y transparencia; sin cyan ni brillo de color. Un archivo por llamada.
- head-v3.png: preservar cabeza, registro del lienzo, ojos transparentes, cuernos y marcas. Sustituir solo borde inferior del hocico por labio obsidiana dentado en zigzag y cuatro pequenos colmillos marfil unidos al labio, siguiendo el primer plano. Transparencia debajo; sin mandibula, cavidad o segunda linea de boca.
- jaw-v3.png: unica mandibula inferior obsidiana, frontal simetrica, borde superior dentado y menton central en V; sin nariz, dientes, lengua, cavidad ni cyan. Referencias: primer plano y mandibula anterior.
- cavity-v3.png: editar la cavidad anterior quitando dientes, lengua, contorno de labio y relieves; conservar solo receso interior oscuro borgona casi negro, ovalo ancho, fondo transparente.
- tongue-v3.png: unica lengua aislada borgona apagada, ancha y poco alta, surco central y sombreado suave, sin dientes, cavidad ni bordes de boca.

Archivos activos y hashes: provenance.json. Registro y orden de capas: rig.json.

Revision4 de generacion (ImageGen integrada): edit target head-v3.png. Prompt: retirar TODOS los cuatro colmillos, continuar la piel obsidiana y contorno zigzag adyacente, conservar exactamente registro del lienzo, cuernos, nariz, marcas cyan, aperturas transparentes y silueta. Cero dientes, sin mandibula, lengua, cavidad ni nuevos detalles. Salida head-v4.png. Las demas piezas se reutilizan. Cavidad negra generada por codigo y recortada, no un PNG rojo.

Revision fondo/dientes inferiores: ImageGen integrada, unicamente lower-teeth.png. Referencia jaw-v3.png para estilo. Prompt: generar SOLO una fila de SEIS dientes inferiores triangulares marfil apuntando hacia arriba, frontal simetrica, pequenos y separados por transparencia, raices en linea horizontal, exteriores algo mayores, sombreado gris suave y borde obsidiana fino. Sin mandibula, encia, placa, boca, cabeza, lengua ni fondo. Fila ancha centrada con padding transparente. Cabeza y dos colmillos superiores originales intactos.

## Silver jaw — 2026-11-19
Built-in ImageGen precise-object-edit; inputs jaw.png and reference.png. Prompt: recolor only the isolated jaw to silver gray matching chest scales; preserve canvas 2172x724, silhouette, facets, dark outlines and transparent padding; no teeth or additional elements. Output jaw-silver.png. Generated alpha preserved. Alpha>32 bounds original (178,118,1994,629), generated (174,114,2001,629): slight generative edge variation. Same UV, rect, pivots, mouth edges and all animation code retained; all preexisting PNG hashes unchanged. Streamlabs visual confirmation pending.
