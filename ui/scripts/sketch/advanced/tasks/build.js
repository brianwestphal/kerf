function readJSON(path) {
  var content = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!content) throw new Error('Cannot read ' + path);
  return JSON.parse(String(content));
}

var blurShadows = require('../../shared/blur-shadows');
var semanticLayout = require('./semantic-layout');
var migration = require('./migrate');

module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var fixtures = readJSON(parameters.fixturesPath);
  var prior = parameters.hasManifest
    ? readJSON(parameters.manifestPath).symbols
    : {};
  var report = [];
  function build(document) {
    try {
      var page = document.selectedPage;
      page.name = 'Advanced Inputs';
      fixtures.forEach(function (fixture, index) {
        session.check();
        var old = prior[fixture.id];
        var matches = dom
          .find('SymbolMaster', document)
          .filter(function (item) {
            return old
              ? item.symbolId === old.symbolId
              : item.name === fixture.name;
          });
        if (matches.length > 1)
          throw new Error('Duplicate form Symbol: ' + fixture.id);
        var symbol = matches[0];
        if (old && !symbol)
          throw new Error('Previously published Symbol missing: ' + fixture.id);
        if (old && old.sourceHash !== fixture.sourceHash) {
          var source = dom.createLayerFromData(fixture.svg, 'svg');
          if (!source)
            throw new Error('Edited SVG import failed: ' + fixture.id);
          // Measure Text frames in the published font, as a fresh import
          // does, so migrated fixed-width text is not clipped.
          dom.find('Text', source).forEach(function (text) {
            text.style.fontFamily = 'system';
          });
          if (symbol.layers.length !== 1)
            throw new Error('Published Advanced root changed: ' + fixture.id);
          var pairs = migration.plan(
            symbol.layers[0],
            source,
            fixture.id,
            old.text,
          );
          migration.apply(pairs);
          symbol.frame.width = fixture.box.width;
          symbol.frame.height = fixture.box.height;
        }
        if (!symbol) {
          symbol = new dom.SymbolMaster({
            name: fixture.name,
            parent: page,
            frame: {
              x: (index % 3) * 500,
              y: Math.floor(index / 3) * 220,
              width: fixture.box.width,
              height: fixture.box.height,
            },
          });
          var imported = dom.createLayerFromData(fixture.svg, 'svg');
          if (!imported) throw new Error('SVG import failed: ' + fixture.id);
          imported.parent = symbol;
          imported.name = 'Production Capture';
          imported.frame.x = 0;
          imported.frame.y = 0;
          dom.find('Text', symbol).forEach(function (text) {
            text.style.fontFamily = 'system';
          });
        }
        // Re-apply the idempotent layout to every master so a contract change
        // reaches published Symbols, not only new or migrated ones.
        blurShadows.apply(symbol, fixture.svg, dom);
        semanticLayout.apply(symbol, fixture, dom);
        symbol.name = fixture.name;
        symbol.background.enabled = false;
        var texts = dom.find('Text', symbol);
        var paths = dom.find('ShapePath', symbol);
        var bitmaps = dom.find('Image', symbol);
        if (paths.length === 0 || bitmaps.length !== 0)
          throw new Error(
            'Advanced Symbol lost editable vectors or gained bitmaps: ' +
              fixture.id,
          );
        report.push({
          id: fixture.id,
          name: symbol.name,
          symbolId: symbol.symbolId,
          layerId: symbol.id,
          width: symbol.frame.width,
          height: symbol.frame.height,
          text: texts.map(function (text) {
            return { id: text.id, value: text.text };
          }),
          paths: paths.length,
          bitmaps: bitmaps.length,
          sourceHash: fixture.sourceHash,
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
