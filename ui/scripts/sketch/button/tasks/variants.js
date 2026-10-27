function readJSON(path) {
  var text = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!text) throw new Error('Cannot read ' + path);
  return JSON.parse(String(text));
}

function descendants(layer, dom, type) {
  return dom.find(type, layer);
}

var iconPaths = require('./icon-paths');

function build(session, parameters, document) {
  var dom = session.dom;
  var fixtures = readJSON(parameters.variantFixturesPath);
  var previous = parameters.hasVariantManifest
    ? readJSON(parameters.variantManifestPath).variants
    : {};
  var pathMappings = readJSON(parameters.iconPathIdentitiesPath).fixtures;
  var report = [];
  fixtures.forEach(function (fixture, index) {
    session.check();
    var layout = fixture.layout;
    var old = previous[fixture.id];
    var symbol = dom.find('SymbolMaster', document).filter(function (item) {
      return old ? item.symbolId === old.symbolId : item.name === fixture.name;
    })[0];
    if (old && !symbol)
      throw new Error('Missing variant master: ' + fixture.id);
    if (!symbol)
      symbol = new dom.SymbolMaster({
        name: fixture.name,
        parent: document.selectedPage,
        frame: {
          x: (index % 4) * 250,
          y: 400 + Math.floor(index / 4) * 120,
          width: layout.width,
          height: layout.height,
        },
      });
    symbol.name = fixture.name;
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
    symbol.style.opacity = layout.opacity;
    symbol.clipsContents = false;
    var label = symbol.layers.filter(function (layer) {
      return layer.name === 'Label';
    })[0];
    if (layout.label !== null) {
      if (!label)
        label = new dom.Text({
          name: 'Label',
          text: layout.label,
          parent: symbol,
        });
      label.nameIsFixed = true;
      label.text = layout.label;
      label.style.fontFamily = 'system';
      label.style.fontWeight = 6;
      label.style.fontSize = layout.fontSize;
      label.style.textColor = layout.textColor;
      label.style.opacity = fixture.props.loading ? 0 : 1;
      label.style.alignment = dom.Text.Alignment.center;
      label.style.verticalAlignment = dom.Text.VerticalAlignment.center;
      label.style.kerning = null;
      label.style.lineHeight = null;
      label.fixedWidth = false;
      label.adjustToFit();
      label.horizontalSizing = dom.FlexSizing.Fit;
      label.verticalSizing = dom.FlexSizing.Fit;
      label.horizontalPins = dom.Pin.None;
      label.verticalPins = dom.Pin.None;
    } else if (label) label.remove();
    var icon = symbol.layers.filter(function (layer) {
      return layer.name === 'Icon';
    })[0];
    if (layout.icon) {
      if (pathMappings[fixture.id]) {
        var sourceIcon = dom.createLayerFromData(layout.icon.svg, 'svg');
        if (!sourceIcon) throw new Error('Cannot import icon: ' + fixture.id);
        icon = iconPaths.reconcile(
          icon,
          sourceIcon,
          fixture.id,
          pathMappings[fixture.id],
          old && old.iconPaths,
        );
        if (!icon.parent) icon.parent = symbol;
      }
      icon.name = 'Icon';
      icon.nameIsFixed = true;
      icon.frame.width = layout.icon.width;
      icon.frame.height = layout.icon.height;
      icon.style.opacity = fixture.props.loading ? 0 : 1;
      descendants(icon, dom, 'ShapePath').forEach(function (path) {
        path.style.borders.forEach(function (border) {
          border.color = layout.textColor;
        });
        path.style.fills.forEach(function (fill) {
          fill.color = layout.textColor;
        });
      });
      icon.horizontalSizing = dom.FlexSizing.Fixed;
      icon.verticalSizing = dom.FlexSizing.Fixed;
      icon.index = 0;
    } else if (icon) icon.remove();
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
    symbol.horizontalSizing =
      fixture.props.children === undefined
        ? dom.FlexSizing.Fixed
        : dom.FlexSizing.Fit;
    symbol.verticalSizing = dom.FlexSizing.Fixed;
    symbol.minSize = {
      width:
        fixture.props.children === undefined
          ? layout.height
          : layout.padding.left +
            layout.padding.right +
            (layout.icon ? layout.icon.width + layout.gap : 0),
      height: layout.height,
    };
    symbol.stackLayout.apply();
    if (fixture.props.children === undefined)
      symbol.frame.width = layout.height;

    // The state decorations are native layers outside the content Stack.
    var badgeShape = symbol.layers.filter(function (layer) {
      return layer.name === 'Badge Background';
    })[0];
    var badgeText = symbol.layers.filter(function (layer) {
      return layer.name === 'Badge Count';
    })[0];
    if (layout.badge) {
      var badge = layout.badge;
      if (badgeShape && badgeShape.type === 'ShapePath') {
        badgeShape.remove();
        badgeShape = null;
      }
      if (!badgeShape) {
        badgeShape = dom.createLayerFromData(
          '<svg xmlns="http://www.w3.org/2000/svg" width="' +
            badge.width +
            '" height="' +
            badge.height +
            '" viewBox="0 0 ' +
            badge.width +
            ' ' +
            badge.height +
            '"><rect width="' +
            badge.width +
            '" height="' +
            badge.height +
            '" rx="' +
            badge.height / 2 +
            '" fill="' +
            badge.fill +
            '"/></svg>',
          'svg',
        );
        if (!badgeShape)
          throw new Error('Badge SVG import failed: ' + fixture.id);
        badgeShape.parent = symbol;
      }
      badgeShape.frame = {
        x: badge.x,
        y: badge.y,
        width: badge.width,
        height: badge.height,
      };
      descendants(badgeShape, dom, 'ShapePath').forEach(function (path) {
        path.style.fills = [{ color: badge.fill }];
        path.style.borders = [];
      });
      badgeShape.name = 'Badge Background';
      badgeShape.ignoresStackLayout = true;
      badgeShape.horizontalSizing = dom.FlexSizing.Fixed;
      badgeShape.verticalSizing = dom.FlexSizing.Fixed;
      badgeShape.horizontalPins = dom.Pin.Max;
      badgeShape.verticalPins = dom.Pin.Min;
      if (!badge.dot) {
        if (!badgeText)
          badgeText = new dom.Text({
            name: 'Badge Count',
            text: badge.text,
            parent: symbol,
          });
        badgeText.text = badge.text;
        badgeText.style.fontFamily = 'system';
        badgeText.style.fontWeight = 8;
        badgeText.style.fontSize = badge.fontSize;
        badgeText.style.textColor = badge.textColor;
        badgeText.style.alignment = dom.Text.Alignment.center;
        badgeText.style.verticalAlignment = dom.Text.VerticalAlignment.center;
        badgeText.frame = {
          x: badge.x,
          y: badge.y,
          width: badge.width,
          height: badge.height,
        };
        badgeText.fixedWidth = true;
        badgeText.ignoresStackLayout = true;
        badgeText.horizontalPins = dom.Pin.Max;
        badgeText.verticalPins = dom.Pin.Min;
        badgeText.moveToFront();
      }
    } else {
      if (badgeShape) badgeShape.remove();
      if (badgeText) badgeText.remove();
    }
    var spinnerHost = symbol.layers.filter(function (layer) {
      return layer.name === 'Spinner Host';
    })[0];
    var spinner = spinnerHost
      ? spinnerHost.layers.filter(function (layer) {
          return layer.name === 'Spinner';
        })[0]
      : symbol.layers.filter(function (layer) {
          return layer.name === 'Spinner';
        })[0];
    if (layout.spinner) {
      var spinnerX = (symbol.frame.width - layout.spinner.width) / 2;
      var spinnerY = (layout.height - layout.spinner.height) / 2;
      if (!spinnerHost)
        spinnerHost = new dom.Group.Frame({
          name: 'Spinner Host',
          parent: symbol,
          frame: {
            x: spinnerX,
            y: spinnerY,
            width: layout.spinner.width,
            height: layout.spinner.height,
          },
        });
      spinnerHost.frame = {
        x: spinnerX,
        y: spinnerY,
        width: layout.spinner.width,
        height: layout.spinner.height,
      };
      spinnerHost.background.enabled = false;
      spinnerHost.style.fills = [];
      spinnerHost.style.borders = [];
      spinnerHost.ignoresStackLayout = true;
      spinnerHost.horizontalPins = dom.Pin.All;
      spinnerHost.verticalPins = dom.Pin.All;
      spinnerHost.horizontalSizing = dom.FlexSizing.Fixed;
      spinnerHost.verticalSizing = dom.FlexSizing.Fixed;
      if (!spinner) {
        spinner = dom.createLayerFromData(layout.spinner.svg, 'svg');
        if (!spinner) throw new Error('Cannot import spinner: ' + fixture.id);
      }
      spinner.parent = spinnerHost;
      spinner.name = 'Spinner';
      spinner.frame = {
        x: 0,
        y: 0,
        width: layout.spinner.width,
        height: layout.spinner.height,
      };
      spinner.ignoresStackLayout = false;
      spinner.horizontalSizing = dom.FlexSizing.Fixed;
      spinner.verticalSizing = dom.FlexSizing.Fixed;
      spinner.horizontalPins = dom.Pin.None;
      spinnerHost.stackLayout = {
        direction: dom.StackLayout.Direction.Row,
        justifyContent: dom.StackLayout.JustifyContent.Center,
        alignItems: dom.StackLayout.AlignItems.Center,
        gap: 0,
        padding: 0,
        wraps: false,
        bordersAffectLayout: false,
      };
      spinnerHost.stackLayout.apply();
    } else if (spinnerHost) spinnerHost.remove();
    var ring = symbol.layers.filter(function (layer) {
      return layer.name === 'Focus Ring';
    })[0];
    if (ring) ring.remove();
    if (fixture.props.pressed) {
      symbol.style.innerShadows = layout.shadowColor
        ? [
            {
              color: layout.shadowColor,
              x: 0,
              y: 0,
              blur: 0,
              spread: fixture.props.emphasis === 'secondary' ? 1 : 2,
            },
          ]
        : [];
    } else if (fixture.focus) {
      if (fixture.props.focusRingInset) {
        symbol.style.innerShadows = [
          {
            color: fixture.theme === 'dark' ? '#1c1c1eff' : '#ffffffff',
            x: 0,
            y: 0,
            blur: 0,
            spread: 5,
          },
          { color: layout.outlineColor, x: 0, y: 0, blur: 0, spread: 3 },
        ];
        symbol.style.shadows = [];
      } else {
        symbol.style.innerShadows = [];
        symbol.style.shadows = [
          { color: layout.outlineColor, x: 0, y: 0, blur: 0, spread: 3 },
          {
            color: fixture.theme === 'dark' ? '#1c1c1eff' : '#ffffffff',
            x: 0,
            y: 0,
            blur: 0,
            spread: 1,
          },
        ];
      }
    } else symbol.style.innerShadows = [];
    if (descendants(symbol, dom, 'Image').length)
      throw new Error('Bitmap in variant ' + fixture.id);
    report.push({
      id: fixture.id,
      name: symbol.name,
      masterId: symbol.id,
      symbolId: symbol.symbolId,
      frame: symbol.frame.toJSON(),
      layers: symbol.layers.map(function (layer) {
        return {
          id: layer.id,
          name: layer.name,
          type: layer.type,
          frame: layer.frame.toJSON(),
          ignoresStackLayout: layer.ignoresStackLayout,
          horizontalPins: layer.horizontalPins,
          verticalPins: layer.verticalPins,
        };
      }),
      iconPaths: icon
        ? descendants(icon, dom, 'ShapePath').map(function (path) {
            return { id: path.id, name: path.name, svg: path.getSVGPath() };
          })
        : [],
      stack: symbol.stackLayout.toJSON(),
    });
    dom.export(symbol, {
      formats: 'png',
      scales: '2',
      output: parameters.variantExportsPath,
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
      var report = build(session, parameters, document);
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
