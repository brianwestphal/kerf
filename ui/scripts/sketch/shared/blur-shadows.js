// A captured box-shadow is a rect painted through an feGaussianBlur filter.
// Sketch's SVG import drops the filter and keeps a hard, offset rectangle, so
// find that imported layer and give it the equivalent native Gaussian blur.
function shadowSpecs(svg) {
  var deviations = {};
  var filters = svg.matchAll(
    /<filter\b[^>]*\bid="([^"]+)"[^>]*>\s*<feGaussianBlur\b[^>]*stdDeviation="([\d.]+)"[^>]*\/>\s*<\/filter>/g,
  );
  for (var filter of filters) deviations[filter[1]] = Number(filter[2]);
  var specs = [];
  var rects = svg.matchAll(/<rect\b([^>]*)\/>/g);
  for (var rect of rects) {
    var id = /filter="url\(#([^)]+)\)"/.exec(rect[1]);
    if (!id) continue;
    if (deviations[id[1]] === undefined)
      throw new Error('Unsupported capture filter: ' + id[1]);
    var number = function (name) {
      return Number(
        new RegExp('\\b' + name + '="([-\\d.]+)"').exec(rect[1])[1],
      );
    };
    specs.push({
      x: number('x'),
      y: number('y'),
      width: number('width'),
      height: number('height'),
      deviation: deviations[id[1]],
    });
  }
  return specs;
}

function origin(layer, root) {
  var x = 0;
  var y = 0;
  for (var node = layer; node && node.id !== root.id; node = node.parent) {
    x += node.frame.x;
    y += node.frame.y;
  }
  return { x: x, y: y };
}

module.exports.apply = function (symbol, svg, dom) {
  var specs = shadowSpecs(svg);
  if (!specs.length) return 0;
  var paths = dom.find('ShapePath', symbol);
  specs.forEach(function (spec) {
    var match = paths.filter(function (path) {
      var at = origin(path, symbol);
      return (
        Math.abs(at.x - spec.x) < 1 &&
        Math.abs(at.y - spec.y) < 1 &&
        Math.abs(path.frame.width - spec.width) < 1 &&
        Math.abs(path.frame.height - spec.height) < 1
      );
    })[0];
    if (!match)
      throw new Error(
        'Imported shadow layer not found for ' + JSON.stringify(spec),
      );
    // The JS API exposes no blur in this Sketch version; style part type 3
    // is a native MSStyleBlur, and blur type 0 is Gaussian. Reuse an existing
    // blur so a rebuild stays idempotent. Its radius matches stdDeviation.
    var style = match.sketchObject.style();
    if (!style.blurs().count()) style.addStylePartOfType(3);
    var blur = style.blurs().firstObject();
    blur.setType(0);
    blur.setRadius(spec.deviation);
    blur.setIsEnabled(true);
  });
  return specs.length;
};

module.exports.shadowSpecs = shadowSpecs;
