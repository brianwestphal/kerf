function readJSON(path) {
  var text = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!text) throw new Error('Cannot read ' + path);
  return JSON.parse(String(text));
}

function inspect(symbol, dom) {
  var text = dom.find('Text', symbol).map(function (layer) {
    return {
      id: layer.id,
      text: layer.text,
      fontFamily: layer.style.fontFamily,
      fontSize: layer.style.fontSize,
      frame: layer.frame.toJSON(),
    };
  });
  return {
    id: symbol.id,
    symbolId: symbol.symbolId,
    name: symbol.name,
    frame: symbol.frame.toJSON(),
    text: text,
    bitmaps: dom.find('Image', symbol).length,
    shapePaths: dom.find('ShapePath', symbol).length,
  };
}

module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var fixtures = readJSON(parameters.fixturesPath);
  var document = session.createDocument();
  var page = document.selectedPage;
  page.name = 'Button Symbols';
  var systemFont = NSFont.systemFontOfSize_weight(16, 0.23);
  var report = {
    sketchVersion: String(
      NSBundle.mainBundle().objectForInfoDictionaryKey(
        'CFBundleShortVersionString',
      ),
    ),
    systemFont: {
      family: String(systemFont.familyName()),
      name: String(systemFont.fontName()),
    },
    symbols: [],
  };
  try {
    fixtures.forEach(function (fixture, index) {
      session.check();
      var symbol = new dom.SymbolMaster({
        name: fixture.name,
        parent: page,
        frame: {
          x: (index % 3) * 250,
          y: Math.floor(index / 3) * 150,
          width: fixture.width,
          height: fixture.height,
        },
      });
      var imported = dom.createLayerFromData(fixture.svg, 'svg');
      if (!imported) throw new Error('SVG import failed for ' + fixture.id);
      imported.parent = symbol;
      imported.name = 'Production SVG';
      imported.frame.x = 0;
      imported.frame.y = 0;
      dom.find('Text', symbol).forEach(function (layer) {
        layer.style.fontFamily = String(systemFont.familyName());
        layer.style.fontWeight = 6;
      });
      var info = inspect(symbol, dom);
      if (info.bitmaps !== 0 || info.text.length === 0)
        throw new Error(
          'Import lost editable text or rasterized ' + fixture.id,
        );
      report.symbols.push(info);
      dom.export(symbol, {
        formats: 'png',
        scales: '2',
        output: parameters.exportsPath,
        filename: fixture.id,
        overwriting: true,
      });
    });
    session.saveDocument(document, parameters.libraryPath, function (error) {
      done(error, report);
    });
  } catch (error) {
    done(error);
  }
};
