function fixedLeft(layer, dom) {
  layer.horizontalSizing = dom.FlexSizing.Fixed;
  layer.horizontalPins = dom.Pin.Min;
  (layer.layers || []).forEach(function (child) {
    fixedLeft(child, dom);
  });
}

function pinFluid(layer, dom) {
  var width = layer.frame.width;
  (layer.layers || []).forEach(function (child) {
    if (child.type !== 'Text' && child.frame.width >= width * 0.82) {
      child.horizontalPins = dom.Pin.All;
    } else if (child.frame.x >= width * 0.65 && child.frame.width < 80) {
      child.horizontalPins = dom.Pin.Max;
    }
    pinFluid(child, dom);
  });
}

module.exports.apply = function (symbol, fixture, dom) {
  var root = symbol.layers[0];
  fixedLeft(root, dom);
  if (fixture.component === 'color-swatches') return;
  root.horizontalPins = dom.Pin.All;
  pinFluid(root, dom);
};
