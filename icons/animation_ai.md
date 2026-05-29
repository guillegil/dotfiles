1. El SVG del ícono tiene 3 piezas
El glifo ai está formado por tres elementos dentro del <svg>:

un <path> → la estrella central (sparkle)
dos <circle> → los puntos satélite (arriba-derecha y abajo-izquierda)
Eso me permite animar cada parte por separado.

2. Las dos keyframes
/* la estrella "respira" como una burbuja que se infla */
@keyframes ai-bubble {
  0%,100% { transform: scale(.88) }
  50%     { transform: scale(1.08) }
}
/* los puntos titilan: encogen + se desvanecen, luego crecen + brillan */
@keyframes ai-twinkle {
  0%,100% { transform: scale(.55); opacity:.35 }
  50%     { transform: scale(1.2);  opacity:1   }
}
3. El truco clave: transform-box: fill-box
Por defecto, un transform: scale() en un elemento SVG se calcula respecto al origen del lienzo (0,0), así que el ícono se escaparía hacia una esquina en vez de "inflarse" en su sitio. Lo corrijo con:

.icon[data-name="ai"] .glyph svg > * {
  transform-box: fill-box;     /* el origen pasa a ser la caja del propio elemento */
  transform-origin: center;    /* y escala desde su centro */
}
Así cada pieza crece/encoge desde su propio centro. También puse overflow: visible en el <svg> para que los puntos no se recorten al agrandarse cerca del borde.

4. El desfase (lo que da el efecto "vivo")
Las tres piezas usan la misma duración (2.6 s) pero arrancan en momentos distintos mediante el animation-delay, así nunca laten a la vez:

svg > path                 { animation: ai-bubble  2.6s ease-in-out infinite; }
svg > circle:nth-of-type(1){ animation: ai-twinkle 2.6s ease-in-out .25s infinite; }
svg > circle:nth-of-type(2){ animation: ai-twinkle 2.6s ease-in-out 1.05s infinite; }
La estrella respira, un punto titila a los 0,25 s y el otro a 1,05 s → sensación de efervescencia/burbujeo.

5. Accesibilidad
Todo el bloque va envuelto en @media (prefers-reduced-motion: no-preference), así que si el usuario tiene activada la reducción de movimiento, la animación simplemente no se aplica — siguiendo la regla del sistema de diseño de Cachy Bar.

En resumen: CSS puro, sin JavaScript ni librerías — solo dos @keyframes, transform-box: fill-box para escalar en su lugar, y delays distintos para escalonar el latido.

¿Quieres que te lo deje también como snippet reutilizable (una clase tipo .ai-bubbling) para poder pegarlo en otros sitios?
