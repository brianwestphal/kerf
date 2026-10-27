function fixedLeft(layer, dom) {
  layer.horizontalSizing = dom.FlexSizing.Fixed;
  layer.horizontalPins = dom.Pin.Min;
  (layer.layers || []).forEach(function (child) {
    fixedLeft(child, dom);
  });
}

function pinFluid(layer, dom, centered) {
  var width = layer.frame.width;
  (layer.layers || []).forEach(function (child) {
    var trailingGap = width - child.frame.x - child.frame.width;
    // Pin.All alone stretches an SVG-imported group; a sizing mode other
    // than Fixed on a non-stack child stops it from following the width.
    if (child.type !== 'Text' && child.frame.width >= width * 0.82) {
      child.horizontalPins = dom.Pin.All;
    } else if (centered) {
      // Centered compositions keep their content centered as they widen.
      child.horizontalPins = dom.Pin.None;
    } else if (child.frame.x >= width * 0.5) {
      // The trailing half moves as one cluster, so a button's background and
      // label stay together; text at the edge right-aligns.
      child.horizontalPins = dom.Pin.Max;
      if (child.type === 'Text' && trailingGap <= 24)
        child.style.alignment = 'right';
    }
    pinFluid(child, dom, centered);
  });
}

module.exports.apply = function (symbol, fixture, dom) {
  if (
    [
      'disclosure',
      'message-composer',
      'progress-bar',
      'progress-ring',
      'state-banner',
      'empty-state',
      'skeleton',
    ].indexOf(fixture.component) < 0
  )
    throw new Error(
      'Unsupported content/feedback layout: ' + fixture.component,
    );
  var root = symbol.layers[0];
  // SVG import makes the capture a Graphic (groupBehavior 2), which scales
  // its contents and ignores every pin below it. A plain group (0) honors
  // the pins; the JS API exposes no setter, so use the native layer.
  root.sketchObject.setGroupBehavior(0);
  fixedLeft(root, dom);
  // Ring geometry stays fixed; container and progress-track structure can
  // resize while labels and decorations keep their authored dimensions.
  if (fixture.component === 'progress-ring') return;
  root.horizontalPins = dom.Pin.All;
  pinFluid(root, dom, fixture.component === 'empty-state');
};
