// SVG import keeps captured text but not its weight, and every family build
// switches Text to the system font. Read each captured string's CSS weight and
// family so the native Text can match the production capture.
var sans = require('./sans-family');

function textStyles(svg) {
  var styles = {};
  var tags = svg.matchAll(/<text\b([^>]*)>(.*?)<\/text>/g);
  for (var tag of tags) {
    var value = tag[2]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      // Sketch trims the trailing space a capture keeps between inline runs.
      .trim();
    var cssWeight = Number(/font-weight="([^"]+)"/.exec(tag[1])?.[1] || 400);
    var family = (/font-family="([^"]+)"/.exec(tag[1])?.[1] || '')
      .replace(/&quot;/g, '"')
      .toLowerCase();
    var style = {
      // Sketch weights: 5 regular, 6 medium, 8 semibold.
      weight: cssWeight >= 600 ? 8 : cssWeight >= 500 ? 6 : 5,
      // A monospace capture keeps its named face; everything else is system.
      family: /monospace/.test(family)
        ? /"([^"]+)"/.exec(family)?.[1].replace(/\b\w/g, function (c) {
            return c.toUpperCase();
          }) || 'Menlo'
        : sans.family,
    };
    var previous = styles[value];
    if (
      previous &&
      (previous.weight !== style.weight || previous.family !== style.family)
    )
      throw new Error('Ambiguous source text style: ' + value);
    styles[value] = style;
  }
  return styles;
}

module.exports.textStyles = textStyles;

module.exports.apply = function (symbol, svg, dom) {
  var styles = textStyles(svg);
  dom.find('Text', symbol).forEach(function (text) {
    var style = styles[String(text.text).trim()];
    if (!style) throw new Error('Missing source text style: ' + text.text);
    text.style.fontFamily = style.family;
    text.style.fontWeight = style.weight;
    // A heavier weight can outgrow a fixed frame measured at regular weight,
    // which wraps or clips the label. Measure the natural width: keep the
    // fixed frame when the text still fits, otherwise leave it auto-fitted.
    var fixedWidth = text.fixedWidth ? text.frame.width : null;
    text.fixedWidth = false;
    text.adjustToFit();
    if (fixedWidth !== null && text.frame.width <= fixedWidth + 0.5) {
      text.fixedWidth = true;
      text.frame.width = fixedWidth;
    }
  });
};
