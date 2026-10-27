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
  var identities = parameters.hasIdentityManifest
    ? readJSON(parameters.identitiesPath).variants
    : {};
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
  function build(document) {
    try {
      var page = document.selectedPage;
      if (!parameters.seedExisting) page.name = 'Button Symbols';
      fixtures.forEach(function (fixture, index) {
        session.check();
        var prior = identities[fixture.id];
        var matches = dom
          .find('SymbolMaster', document)
          .filter(function (item) {
            return prior
              ? item.symbolId === prior.symbolId
              : !parameters.hasIdentityManifest && item.name === fixture.name;
          });
        if (matches.length > 1)
          throw new Error('Duplicate Symbol master: ' + fixture.name);
        var symbol = matches[0];
        if (prior && !symbol)
          throw new Error(
            'Previously generated Symbol is missing: ' + fixture.id,
          );
        if (!symbol) {
          if (
            dom.find('SymbolMaster', document).some(function (item) {
              return item.name === fixture.name;
            })
          )
            throw new Error(
              'New variant name collides with an existing Symbol: ' +
                fixture.id,
            );
          symbol = new dom.SymbolMaster({
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
        }
        symbol.name = fixture.name;
        var info = inspect(symbol, dom);
        if (info.bitmaps !== 0 || info.text.length === 0)
          throw new Error(
            'Symbol lost editable text or gained a bitmap: ' + fixture.id,
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
      session.saveDocument(
        document,
        parameters.libraryPath,
        function (error) {
          done(error, report);
        },
        { inPlace: parameters.seedExisting },
      );
    } catch (error) {
      done(error);
    }
  }
  if (parameters.seedExisting)
    session.openDocument(parameters.libraryPath, function (error, document) {
      if (error) return done(error);
      build(document);
    });
  else build(session.createDocument());
};
