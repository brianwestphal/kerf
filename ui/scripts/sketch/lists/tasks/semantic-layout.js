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
    var trailingGap = width - child.frame.x - child.frame.width;
    // Pin.All alone stretches an SVG-imported group; FlexSizing.Fill on a
    // non-stack child stops it from following the instance width. Inset row
    // content groups must stretch too, or their trailing actions stay put.
    if (child.type !== 'Text' && child.frame.width >= width * 0.82) {
      child.horizontalPins = dom.Pin.All;
    } else if (child.frame.x >= width * 0.5 && trailingGap <= 24) {
      // Trailing actions and right-aligned values follow the trailing edge;
      // right alignment keeps a shorter text override on that edge too.
      child.horizontalPins = dom.Pin.Max;
      if (child.type === 'Text') child.style.alignment = 'right';
    }
    pinFluid(child, dom);
  });
}

module.exports.apply = function (symbol, fixture, dom) {
  if (
    [
      'list',
      'list-item',
      'list-header',
      'list-action-row',
      'value-table',
    ].indexOf(fixture.component) < 0
  )
    throw new Error('Unsupported list/data layout: ' + fixture.component);
  var root = symbol.layers[0];
  // SVG import makes the capture a Graphic (groupBehavior 2), which scales
  // its contents and ignores every pin below it. A plain group (0) honors
  // the pins; the JS API exposes no setter, so use the native layer.
  root.sketchObject.setGroupBehavior(0);
  fixedLeft(root, dom);
  // Whole lists and individual rows share the same stretch contract, but
  // retain separate Symbol masters and row-level text/action ownership.
  root.horizontalPins = dom.Pin.All;
  pinFluid(root, dom);
};
