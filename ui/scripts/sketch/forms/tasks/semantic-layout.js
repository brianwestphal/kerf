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

// The leading icon sits just left of the label wherever the button centers
// its content; a full-width button centers it far from the leading edge. An
// icon the old layout left behind can overlap the re-centered label.
function leadingIcon(content, labelX, dom, exclude) {
  return content.layers.filter(function (layer) {
    var gap = labelX - (layer.frame.x + layer.frame.width);
    return (
      exclude.indexOf(layer) < 0 &&
      layer.type === 'Group' &&
      layer.frame.width < 20 &&
      layer.frame.x < labelX &&
      gap >= -layer.frame.width &&
      gap <= 16 &&
      dom.find('Text', layer).length === 0
    );
  })[0];
}

// Keep the icon's imported size: most icons arrive in a 16px clip host, but a
// bare glyph (the Deploying spinner arc) would be stretched by a forced 16x16.
function placeIcon(iconHost, dom) {
  iconHost.verticalSizing = dom.FlexSizing.Fixed;
  iconHost.index = 1;
}

/**
 * Move an icon the original layout missed into Primary Content, matching
 * what layoutSplitButton now produces. Reparenting keeps the layer ID, and
 * the repair is a no-op once the icon is in place.
 */
function repairSplitButton(symbol, dom) {
  var content = symbol.layers[0].layers[0];
  var primary = content.layers.filter(function (layer) {
    return layer.name === 'Primary Content';
  })[0];
  if (!primary) return false;
  var label = primary.layers.filter(function (layer) {
    return layer.type === 'Text';
  })[0];
  var hasIcon = primary.layers.some(function (layer) {
    return layer.name === 'Icon';
  });
  if (!label || hasIcon) return false;
  var labelX = primary.frame.x + label.frame.x;
  var icon = leadingIcon(content, labelX, dom, [primary]);
  if (!icon) return false;
  var x = icon.frame.x - primary.frame.x;
  icon.parent = primary;
  icon.frame.x = x;
  icon.name = 'Icon';
  icon.horizontalSizing = dom.FlexSizing.Fixed;
  icon.horizontalPins = dom.Pin.None;
  placeIcon(icon, dom);
  label.index = 0;
  return true;
}

module.exports.repair = function (symbol, fixture, dom) {
  return fixture.component === 'split-button' && repairSplitButton(symbol, dom);
};

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
  var iconHost = leadingIcon(content, labelHost.frame.x, dom, [labelHost]);
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
  if (iconHost) placeIcon(iconHost, dom);
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
