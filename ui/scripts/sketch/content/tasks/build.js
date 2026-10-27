function readJSON(path) {
  var content = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!content) throw new Error('Cannot read ' + path);
  return JSON.parse(String(content));
}

var blurShadows = require('./blur-shadows');
var semanticLayout = require('./semantic-layout');

function textWeights(svg) {
  var weights = {};
  var tags = svg.matchAll(/<text\b([^>]*)>(.*?)<\/text>/g);
  for (var tag of tags) {
    var value = tag[2].replace(/&amp;/g, '&');
    var cssWeight = Number(/font-weight="([^"]+)"/.exec(tag[1])?.[1] || 400);
    var weight = cssWeight >= 600 ? 8 : cssWeight >= 500 ? 6 : 5;
    if (weights[value] !== undefined && weights[value] !== weight)
      throw new Error('Ambiguous source text weight: ' + value);
    weights[value] = weight;
  }
  return weights;
}

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
      page.name = 'Content and Feedback';
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
          throw new Error('Duplicate content/feedback Symbol: ' + fixture.id);
        var symbol = matches[0];
        if (old && !symbol)
          throw new Error('Previously published Symbol missing: ' + fixture.id);
        if (old && old.sourceHash !== fixture.sourceHash)
          throw new Error(
            'Source structure changed; migrate native layer IDs: ' + fixture.id,
          );
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
        }
        symbol.name = fixture.name;
        symbol.background.enabled = false;
        blurShadows.apply(symbol, fixture.svg, dom);
        semanticLayout.apply(symbol, fixture, dom);
        var texts = dom.find('Text', symbol);
        var weights = textWeights(fixture.svg);
        texts.forEach(function (text) {
          text.style.fontFamily = 'system';
          if (weights[text.text] === undefined)
            throw new Error('Missing source text weight: ' + text.text);
          text.style.fontWeight = weights[text.text];
          text.fixedWidth = false;
          text.adjustToFit();
        });
        var paths = dom.find('ShapePath', symbol);
        var bitmaps = dom.find('Image', symbol);
        if (paths.length === 0 || bitmaps.length !== 0)
          throw new Error(
            'Content/feedback Symbol lost editable vectors or gained bitmaps: ' +
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
