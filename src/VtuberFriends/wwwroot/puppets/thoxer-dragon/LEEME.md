# Thoxer · Puppet 2D

Rig de20capas para la referencia cibernética aprobada. PNG reconstruidos con ImageGen integrado, transparencia conservada. Prompts en generation-notes.json y head-clean-notes.txt; hashes de los activos en provenance.json. No es una extracción exacta por píxel.

- head-clean.png activo: hocico de titanio intacto sin boca/dientes, huecos oculares estrechos, sin lentes ni cejas incorporados. La referencia original con lentes se conserva sin modificar.
- brow-left y brow-right: dos piezas distintas; la derecha incluye el actuador redondo. Movimiento expresivo moderado.
- iris: lente/pupila circular menta móvil; sclera: fondo fijo; eye-dark y dos cortinas por ojo. La máscara de cabeza conserva la abertura seria incluso cuando los ojos miran.
- Boca geométrica del mismo sistema que Ámbar: sonrisa/apertura/lengua interpoladas sobre hocico, dos colmillos separados que siguen labio. No jaw.
- Torso integra reactor central. head/torso/alas/cejas participan en glow selectivo verde, sincronizado cada4.8s. No se ilumina todo el metal ni las membranas azules.
- En panel Brillo → Brillo cibernético · respiración: interruptor e intensidad. Se activa por defecto solo al renderizar Thoxer; apagar elimina pasadas adicionales. No crea otro RAF.
- Los lentes son el accesorio Rectangulares · Thoxer, archivo editable wwwroot/accessories/glasses-rectangular.svg. No se seleccionan automáticamente. Se pueden ajustar por fuente/modelo en el editor existente.

Export limpio: art/avatar-parts/thoxer-dragon, con scripts/export-puppet-parts.ps1 -Pack thoxer-dragon. No recortar los PNG al editar/upscale. mouth.svg y tongue.svg del export son muestras de color; las curvas animadas viven en surface-mouth.js y shader.
