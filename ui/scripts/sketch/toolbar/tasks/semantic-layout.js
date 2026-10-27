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
    // Pin.All alone stretches an SVG-imported group; a sizing mode other
    // than Fixed on a non-stack child stops it from following the width.
    if (child.type !== 'Text' && child.frame.width >= width * 0.82) {
      child.horizontalPins = dom.Pin.All;
    } else if (child.frame.x >= width * 0.5) {
      // The trailing half moves as one cluster, so a grouped control's
      // background and icons stay together; text at the edge right-aligns.
      child.horizontalPins = dom.Pin.Max;
      if (child.type === 'Text' && trailingGap <= 24)
        child.style.alignment = 'right';
    }
    pinFluid(child, dom);
  });
}

module.exports.apply = function (symbol, fixture, dom) {
  if (
    [
      'toolbar-control-group',
      'toolbar',
      'toolbar-text',
      'tab-bar',
      'segmented-control',
      'choice-chips',
      'chip',
    ].indexOf(fixture.component) < 0
  )
    throw new Error(
      'Unsupported toolbar/navigation layout: ' + fixture.component,
    );
  var root = symbol.layers[0];
  // SVG import makes the capture a Graphic (groupBehavior 2), which scales
  // its contents and ignores every pin below it. A plain group (0) honors
  // the pins; the JS API exposes no setter, so use the native layer.
  root.sketchObject.setGroupBehavior(0);
  fixedLeft(root, dom);
  // Only a Toolbar fills its width (leading content left, trailing controls
  // right). Groups, text, tabs, segments, and chips hug their content, so a
  // wider instance keeps them at their authored size, pinned left. Chip
  // showcase sheets become individual Symbol masters.
  if (fixture.component !== 'toolbar') return;
  root.horizontalPins = dom.Pin.All;
  pinFluid(root, dom);
};
