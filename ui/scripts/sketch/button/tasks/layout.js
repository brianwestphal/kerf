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

function updateIconGeometry(existing, incoming, fixtureId) {
  if (existing.type !== incoming.type)
    throw new Error('Icon layer type changed: ' + fixtureId);
  if (existing.type === 'ShapePath') {
    if (existing.shapeType !== incoming.shapeType)
      throw new Error('Icon path shape type changed: ' + fixtureId);
    existing.points = incoming.points;
    existing.closed = incoming.closed;
    existing.frame = incoming.frame.toJSON();
    return;
  }
  if (!existing.layers || !incoming.layers)
    throw new Error('Unsupported icon layer type: ' + fixtureId);
  if (existing.layers.length !== incoming.layers.length)
    throw new Error('Icon layer count changed: ' + fixtureId);
  existing.frame = incoming.frame.toJSON();
  existing.layers.forEach(function (child, index) {
    updateIconGeometry(child, incoming.layers[index], fixtureId);
  });
}

function createAssets(document, dom, fixtures, previous) {
  var assets = { swatches: {}, layerStyles: {}, textStyles: {} };
  var swatches = {};
  var definitions = [
    [
      'light.brand.fill-loud',
      'Kerf/Light/Brand/Fill Loud',
      'primary-brand-light',
      'fill',
    ],
    [
      'light.brand.on-loud',
      'Kerf/Light/Brand/On Loud',
      'primary-brand-light',
      'textColor',
    ],
    [
      'light.neutral.border-loud',
      'Kerf/Light/Neutral/Border Loud',
      'secondary-light',
      'borderColor',
    ],
    [
      'light.neutral.on-quiet',
      'Kerf/Light/Neutral/On Quiet',
      'secondary-light',
      'textColor',
    ],
    [
      'dark.brand.fill-loud',
      'Kerf/Dark/Brand/Fill Loud',
      'primary-brand-dark',
      'fill',
    ],
    [
      'dark.brand.on-loud',
      'Kerf/Dark/Brand/On Loud',
      'primary-brand-dark',
      'textColor',
    ],
    [
      'dark.neutral.border-loud',
      'Kerf/Dark/Neutral/Border Loud',
      'secondary-dark',
      'borderColor',
    ],
    [
      'dark.neutral.on-quiet',
      'Kerf/Dark/Neutral/On Quiet',
      'secondary-dark',
      'textColor',
    ],
  ];
  definitions.forEach(function (definition) {
    var key = definition[0];
    var name = definition[1];
    var fixture = fixtures.filter(function (item) {
      return item.id === definition[2];
    })[0];
    if (!fixture) throw new Error('Missing token source: ' + definition[2]);
    var color = fixture.layout[definition[3]];
    var prior = previous.swatches && previous.swatches[key];
    var swatch =
      prior &&
      document.swatches.filter(function (item) {
        return item.id === prior.id;
      })[0];
    if (prior && !swatch) throw new Error('Missing Color Variable: ' + key);
    if (!swatch) {
      if (
        document.swatches.some(function (item) {
          return item.name === name;
        })
      )
        throw new Error('Color Variable name collision: ' + name);
      document.swatches.push({ name: name, color: color });
      swatch = document.swatches.filter(function (item) {
        return item.name === name;
      })[0];
    }
    if (
      document.swatches.some(function (item) {
        return item.name === name && item.id !== swatch.id;
      })
    )
      throw new Error('Duplicate Color Variable name: ' + name);
    swatch.name = name;
    swatch.color = color;
    swatches[key] = swatch;
    assets.swatches[key] = { id: swatch.id, name: name, color: color };
  });
  ['light', 'dark'].forEach(function (theme) {
    var icon = fixtures.filter(function (item) {
      return item.id === 'icon-brand-' + theme;
    })[0];
    if (
      !icon ||
      icon.layout.fill !== assets.swatches[theme + '.brand.fill-loud'].color ||
      icon.layout.textColor !== assets.swatches[theme + '.brand.on-loud'].color
    )
      throw new Error('Icon and primary brand token roles disagree: ' + theme);
  });
  function shared(kind, key, name, layer) {
    var previousStyle = previous[kind] && previous[kind][key];
    var collection =
      kind === 'textStyles'
        ? document.sharedTextStyles
        : document.sharedLayerStyles;
    var activeStyle = assets[kind][key];
    var style =
      activeStyle &&
      collection.filter(function (item) {
        return item.id === activeStyle.id;
      })[0];
    if (!style)
      style =
        previousStyle &&
        collection.filter(function (item) {
          return item.id === previousStyle.id;
        })[0];
    if (previousStyle && !style)
      throw new Error('Missing shared style: ' + key);
    if (!style) {
      if (
        collection.some(function (item) {
          return item.name === name;
        })
      )
        throw new Error('Shared style name collision: ' + name);
      style = dom.SharedStyle.fromStyle({
        name: name,
        style: layer.style,
        document: document,
      });
    }
    if (
      collection.some(function (item) {
        return item.name === name && item.id !== style.id;
      })
    )
      throw new Error('Duplicate shared style name: ' + name);
    style.name = name;
    style.style = layer.style;
    layer.sharedStyle = style;
    assets[kind][key] = { id: style.id, name: name };
  }
  return { swatches: swatches, shared: shared, report: assets };
}

function applyLayout(session, parameters, document) {
  var dom = session.dom;
  var fixtures = readJSON(parameters.fixturesPath);
  var previous = parameters.hasIdentityManifest
    ? readJSON(parameters.identitiesPath).assets || {}
    : {};
  var assets = createAssets(document, dom, fixtures, previous);
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
    var theme = fixture.theme;
    var isSecondary = fixture.id.indexOf('secondary-') === 0;
    var family = isSecondary ? 'neutral-secondary' : 'brand-primary';
    var textRole = isSecondary ? 'neutral.on-quiet' : 'brand.on-loud';
    var textSwatch = assets.swatches[theme + '.' + textRole];
    label.style.textSwatch = textSwatch;
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
      } else if (
        parameters.iconGeometryUpdates &&
        parameters.iconGeometryUpdates.indexOf(fixture.id) !== -1
      ) {
        var sourceIcon = dom.createLayerFromData(layout.icon.svg, 'svg');
        if (!sourceIcon)
          throw new Error('Cannot import updated icon in ' + fixture.name);
        updateIconGeometry(icon, sourceIcon, fixture.id);
      }
      icon.name = 'Icon';
      icon.nameIsFixed = true;
      icon.frame.width = layout.icon.width;
      icon.frame.height = layout.icon.height;
      icon.horizontalSizing = dom.FlexSizing.Fixed;
      icon.verticalSizing = dom.FlexSizing.Fixed;
      dom.find('ShapePath', icon).forEach(function (path) {
        path.style.borders.forEach(function (border) {
          border.swatch = textSwatch;
        });
        path.style.fills.forEach(function (fill) {
          fill.swatch = textSwatch;
        });
      });
      icon.index = symbol.layers.length - 1;
    } else if (icons[0]) icons[0].remove();
    symbol.background.enabled = false;
    symbol.style.fills = isSecondary
      ? [{ color: layout.fill }]
      : [{ swatch: assets.swatches[theme + '.brand.fill-loud'] }];
    symbol.style.borders =
      layout.borderColor.slice(-2) === '00'
        ? []
        : [
            {
              swatch: assets.swatches[theme + '.neutral.border-loud'],
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
    assets.shared(
      'layerStyles',
      theme + '.' + family,
      'Kerf/Button/' +
        (isSecondary ? 'Secondary Neutral' : 'Primary Brand') +
        '/' +
        (theme === 'light' ? 'Light' : 'Dark'),
      symbol,
    );
    assets.shared(
      'textStyles',
      theme + '.' + family,
      'Kerf/Button/Label ' +
        (isSecondary ? 'Neutral' : 'Brand') +
        '/' +
        (theme === 'light' ? 'Light' : 'Dark'),
      label,
    );
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
  return { layout: report, assets: assets.report };
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
