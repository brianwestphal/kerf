function readJSON(path) {
  var text = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!text) throw new Error('Cannot read ' + path);
  return JSON.parse(String(text));
}

function layerIdentity(layer) {
  return {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    children: layer.layers ? layer.layers.map(layerIdentity) : [],
  };
}

function applyLayout(session, parameters, document) {
  var dom = session.dom;
  var fixtures = readJSON(parameters.fixturesPath);
  var report = [];
  fixtures.forEach(function (fixture) {
    session.check();
    var layout = fixture.layout;
    var symbol = dom.find('SymbolMaster', document).filter(function (item) {
      return item.name === fixture.name;
    })[0];
    if (!symbol) throw new Error('Missing ' + fixture.name);
    var label = dom.find('Text', symbol)[0];
    if (!label) throw new Error('Missing editable text in ' + fixture.name);
    label.parent = symbol;
    symbol.layers.slice().forEach(function (layer) {
      if (layer.name === 'Production SVG') layer.remove();
    });
    label.name = 'Label';
    label.nameIsFixed = true;
    label.text = layout.label;
    // The source CSS system stack maps to Sketch's native system family.
    label.style.fontFamily = 'system';
    label.style.fontWeight = 6;
    label.style.fontSize = layout.fontSize;
    label.style.alignment = dom.Text.Alignment.center;
    label.style.verticalAlignment = dom.Text.VerticalAlignment.center;
    label.style.textColor = layout.textColor;
    label.style.kerning = null;
    label.style.lineHeight = null;
    label.fixedWidth = false;
    label.adjustToFit();
    label.horizontalSizing = dom.FlexSizing.Fit;
    label.verticalSizing = dom.FlexSizing.Fit;
    label.horizontalPins = dom.Pin.None;
    label.verticalPins = dom.Pin.None;
    var icons = symbol.layers.filter(function (layer) {
      return layer.name === 'Icon';
    });
    if (icons.length > 1)
      throw new Error('Duplicate Icon layers in ' + fixture.name);
    if (layout.icon) {
      var icon = icons[0];
      if (!icon) {
        icon = dom.createLayerFromData(layout.icon.svg, 'svg');
        if (!icon) throw new Error('Cannot import icon in ' + fixture.name);
        icon.parent = symbol;
      }
      icon.name = 'Icon';
      icon.nameIsFixed = true;
      icon.frame.width = layout.icon.width;
      icon.frame.height = layout.icon.height;
      icon.horizontalSizing = dom.FlexSizing.Fixed;
      icon.verticalSizing = dom.FlexSizing.Fixed;
      dom.find('ShapePath', icon).forEach(function (path) {
        path.style.borders.forEach(function (border) {
          border.color = layout.textColor;
        });
        path.style.fills.forEach(function (fill) {
          fill.color = layout.textColor;
        });
      });
      icon.index = symbol.layers.length - 1;
    } else if (icons[0]) icons[0].remove();
    symbol.background.enabled = false;
    symbol.style.fills = [{ color: layout.fill }];
    symbol.style.borders =
      layout.borderColor.slice(-2) === '00'
        ? []
        : [
            {
              color: layout.borderColor,
              thickness: layout.borderWidth,
              position: dom.Style.BorderPosition.Inside,
            },
          ];
    symbol.style.corners = {
      radii: layout.radius,
      style: dom.Style.CornerStyle.Rounded,
    };
    symbol.clipsContents = false;
    symbol.frame.height = layout.height;
    symbol.stackLayout = {
      direction: dom.StackLayout.Direction.Row,
      justifyContent: dom.StackLayout.JustifyContent.Center,
      alignItems: dom.StackLayout.AlignItems.Center,
      gap: layout.gap,
      padding: {
        left: layout.padding.left,
        right: layout.padding.right,
        top: 0,
        bottom: 0,
      },
      wraps: false,
      bordersAffectLayout: false,
    };
    symbol.horizontalSizing = dom.FlexSizing.Fit;
    symbol.verticalSizing = dom.FlexSizing.Fixed;
    symbol.minSize = {
      width:
        layout.padding.left +
        layout.padding.right +
        (layout.icon ? layout.icon.width + layout.gap : 0),
      height: layout.height,
    };
    symbol.stackLayout.apply();
    report.push({
      fixtureId: fixture.id,
      name: symbol.name,
      id: symbol.id,
      symbolId: symbol.symbolId,
      layers: symbol.layers.map(layerIdentity),
      frame: symbol.frame.toJSON(),
      horizontalSizing: symbol.horizontalSizing,
      verticalSizing: symbol.verticalSizing,
      stack: symbol.stackLayout.toJSON(),
      text: {
        id: label.id,
        frame: label.frame.toJSON(),
        alignment: label.style.alignment,
        verticalAlignment: label.style.verticalAlignment,
        fontWeight: label.style.fontWeight,
        horizontalSizing: label.horizontalSizing,
        verticalSizing: label.verticalSizing,
      },
      corners: symbol.style.corners.toJSON(),
    });
    dom.export(symbol, {
      formats: 'png',
      scales: '2',
      output: parameters.exportsPath,
      filename: fixture.id,
      overwriting: true,
    });
  });
  return report;
}

module.exports.run = function (session, parameters, done) {
  session.openDocument(parameters.libraryPath, function (error, document) {
    if (error) return done(error);
    try {
      var report = applyLayout(session, parameters, document);
      session.saveDocument(
        document,
        parameters.libraryPath,
        function (saveError) {
          done(saveError, report);
        },
        { inPlace: true },
      );
    } catch (failure) {
      done(failure);
    }
  });
};
