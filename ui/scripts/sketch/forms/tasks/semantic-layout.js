function fixedLeft(layer, dom) {
  layer.horizontalSizing = dom.FlexSizing.Fixed;
  layer.horizontalPins = dom.Pin.Min;
  (layer.layers || []).forEach(function (child) {
    fixedLeft(child, dom);
  });
}

function pinTextField(symbol, dom) {
  var root = symbol.layers[0];
  var content = root.layers[0];
  fixedLeft(root, dom);
  root.horizontalPins = dom.Pin.All;
  content.horizontalPins = dom.Pin.All;
  var width = symbol.frame.width;
  function pinContent(layer) {
    (layer.layers || []).forEach(function (child) {
      if (child.frame.x >= width * 0.65 && child.frame.width < 80) {
        child.horizontalPins = dom.Pin.Max;
      } else if (
        child.frame.x < 30 &&
        child.frame.width >= width * 0.6 &&
        child.type !== 'Text'
      ) {
        child.horizontalPins = dom.Pin.All;
      }
      pinContent(child);
    });
  }
  pinContent(content);
}

function layoutSplitButton(symbol, dom) {
  var root = symbol.layers[0];
  var content = root.layers[0];
  var width = symbol.frame.width;
  fixedLeft(root, dom);
  root.horizontalPins = dom.Pin.All;
  content.horizontalPins = dom.Pin.All;
  var background = content.layers.filter(function (layer) {
    return layer.type === 'ShapePath' && layer.frame.width >= width - 1;
  })[0];
  if (!background)
    throw new Error('SplitButton background missing: ' + symbol.name);
  background.horizontalPins = dom.Pin.All;
  var labelHost = content.layers.filter(function (layer) {
    return dom.find('Text', layer).length > 0;
  })[0];
  if (!labelHost) throw new Error('SplitButton label missing: ' + symbol.name);
  var label = dom.find('Text', labelHost)[0];
  var iconHost = content.layers.filter(function (layer) {
    return (
      layer !== labelHost &&
      layer.type === 'Group' &&
      layer.frame.x < 30 &&
      layer.frame.width < 20 &&
      dom.find('Text', layer).length === 0
    );
  })[0];
  var primary = new dom.Group({
    name: 'Primary Content',
    parent: content,
    frame: { x: 0, y: 0, width: width - 40, height: 44 },
  });
  if (iconHost) {
    iconHost.parent = primary;
    iconHost.name = 'Icon';
    iconHost.horizontalSizing = dom.FlexSizing.Fixed;
    iconHost.horizontalPins = dom.Pin.None;
  }
  label.parent = primary;
  label.name = 'Label';
  label.nameIsFixed = true;
  label.fixedWidth = false;
  label.adjustToFit();
  label.horizontalSizing = dom.FlexSizing.Fit;
  label.horizontalPins = dom.Pin.None;
  labelHost.remove();
  primary.stackLayout = {
    direction: dom.StackLayout.Direction.Row,
    justifyContent: dom.StackLayout.JustifyContent.Center,
    alignItems: dom.StackLayout.AlignItems.Center,
    gap: 8,
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
    wraps: false,
    bordersAffectLayout: false,
  };
  if (iconHost) {
    iconHost.verticalSizing = dom.FlexSizing.Fixed;
    iconHost.frame.height = 16;
    iconHost.frame.width = 16;
    iconHost.index = 1;
  }
  label.verticalSizing = dom.FlexSizing.Fit;
  label.index = 0;
  primary.verticalSizing = dom.FlexSizing.Fixed;
  primary.frame.height = 44;
  primary.horizontalSizing = dom.FlexSizing.Fixed;
  primary.horizontalPins = dom.Pin.All;
  content.layers.forEach(function (layer) {
    if (
      layer !== primary &&
      layer !== background &&
      layer.frame.x >= width - 45
    ) {
      layer.horizontalSizing = dom.FlexSizing.Fixed;
      layer.horizontalPins = dom.Pin.Max;
    }
  });
}

module.exports.apply = function (symbol, fixture, dom) {
  if (fixture.component === 'split-button') layoutSplitButton(symbol, dom);
  else if (fixture.component === 'text-field') pinTextField(symbol, dom);
  else fixedLeft(symbol.layers[0], dom);
};
