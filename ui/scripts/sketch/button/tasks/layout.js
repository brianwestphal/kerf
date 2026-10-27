function readJSON(path) {
  var text = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!text) throw new Error('Cannot read ' + path);
  return JSON.parse(String(text));
}

module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  session.openDocument(parameters.libraryPath, function (error, document) {
    if (error) return done(error);
    try {
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
          if (layer.id !== label.id) layer.remove();
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
        if (layout.icon) {
          var icon = dom.createLayerFromData(layout.icon.svg, 'svg');
          if (!icon) throw new Error('Cannot import icon in ' + fixture.name);
          icon.parent = symbol;
          icon.name = 'Icon';
          icon.nameIsFixed = true;
          icon.frame.width = layout.icon.width;
          icon.frame.height = layout.icon.height;
          icon.horizontalSizing = dom.FlexSizing.Fixed;
          icon.verticalSizing = dom.FlexSizing.Fixed;
          icon.index = symbol.layers.length - 1;
        }
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
          name: symbol.name,
          id: symbol.id,
          symbolId: symbol.symbolId,
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
      session.saveDocument(
        document,
        parameters.libraryPath,
        function (saveError) {
          done(saveError, report);
        },
      );
    } catch (failure) {
      done(failure);
    }
  });
};
