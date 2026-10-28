function readJSON(path) {
  var content = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!content) throw new Error('Cannot read ' + path);
  return JSON.parse(String(content));
}

var semanticLayout = require('./semantic-layout');

// Bump when semantic-layout output changes for an unchanged source: masters
// built under an older layout are re-laid out through the migration path,
// which re-imports the source and keeps every published layer ID.
var LAYOUT_VERSION = 2;
var textStyles = require('../../shared/text-styles');

function migrationPairs(existing, incoming, fixtureId) {
  var pairs = [];
  function visit(oldLayer, newLayer, path) {
    if (oldLayer.type !== newLayer.type)
      throw new Error(
        'Incompatible form SVG ' +
          fixtureId +
          ' at ' +
          path +
          ': layer type ' +
          oldLayer.type +
          ' -> ' +
          newLayer.type,
      );
    if (
      oldLayer.type === 'ShapePath' &&
      oldLayer.shapeType !== newLayer.shapeType
    )
      throw new Error(
        'Incompatible form SVG ' +
          fixtureId +
          ' at ' +
          path +
          ': shape type ' +
          oldLayer.shapeType +
          ' -> ' +
          newLayer.shapeType,
      );
    var oldChildren = oldLayer.layers || [];
    var newChildren = newLayer.layers || [];
    if (oldChildren.length !== newChildren.length)
      throw new Error(
        'Incompatible form SVG ' +
          fixtureId +
          ' at ' +
          path +
          ': child count ' +
          oldChildren.length +
          ' -> ' +
          newChildren.length,
      );
    newChildren.forEach(function (child, index) {
      if (child.type !== 'Text' || oldChildren[index].text === child.text)
        return;
      var formerIndex = oldChildren.findIndex(function (previous, candidate) {
        return (
          candidate !== index &&
          previous.type === 'Text' &&
          previous.text === child.text
        );
      });
      if (formerIndex >= 0)
        throw new Error(
          'Incompatible form SVG ' +
            fixtureId +
            ' at ' +
            path +
            ': text may have moved from child ' +
            formerIndex +
            ' to ' +
            index +
            '; explicit override-key migration required',
        );
    });
    pairs.push({ existing: oldLayer, incoming: newLayer });
    oldChildren.forEach(function (child, index) {
      visit(child, newChildren[index], path + '/' + index);
    });
  }
  var oldRoots = existing.layers;
  var newRoots = incoming.layers;
  if (oldRoots.length !== newRoots.length)
    throw new Error(
      'Incompatible form SVG ' +
        fixtureId +
        ' at root: child count ' +
        oldRoots.length +
        ' -> ' +
        newRoots.length,
    );
  oldRoots.forEach(function (root, index) {
    visit(root, newRoots[index], 'root/' + index);
  });
  return pairs;
}

function preserveMatchingSwatches(oldStyle, newStyle) {
  ['fills', 'borders'].forEach(function (kind) {
    var oldPaints = oldStyle[kind] || [];
    var newPaints = newStyle[kind] || [];
    newPaints.forEach(function (paint, index) {
      var previous = oldPaints[index];
      if (
        previous &&
        previous.swatch &&
        String(previous.color).toLowerCase() ===
          String(paint.color).toLowerCase()
      )
        paint.swatch = previous.swatch;
    });
  });
}

function migrate(existing, incoming, fixtureId) {
  // Validate the complete tree before changing any published layer.
  var pairs = migrationPairs(existing, incoming, fixtureId);
  pairs.forEach(function (pair) {
    var target = pair.existing;
    var fresh = pair.incoming;
    preserveMatchingSwatches(target.style, fresh.style);
    target.style = fresh.style;
    target.frame = fresh.frame.toJSON();
    target.name = fresh.name;
    target.nameIsFixed = fresh.nameIsFixed;
    target.rotation = fresh.rotation;
    target.isVisible = fresh.isVisible;
    target.horizontalSizing = fresh.horizontalSizing;
    target.horizontalPins = fresh.horizontalPins;
    target.verticalSizing = fresh.verticalSizing;
    target.verticalPins = fresh.verticalPins;
    if (target.type === 'ShapePath') {
      target.points = fresh.points;
      target.closed = fresh.closed;
    }
    if (target.type === 'Text') target.text = fresh.text;
  });
  existing.frame.width = incoming.frame.width;
  existing.frame.height = incoming.frame.height;
  return pairs.length;
}

module.exports.migrationPairs = migrationPairs;
module.exports.migrate = migrate;

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
      page.name = 'Form Controls';
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
        var changed =
          old &&
          (old.sourceHash !== fixture.sourceHash ||
            (old.layoutVersion || 1) !== LAYOUT_VERSION);
        var migratedLayers = 0;
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
          semanticLayout.apply(symbol, fixture, dom);
        }
        if (changed) {
          // Bring an older layout's topology in line with the current one
          // before the migration compares the two trees.
          semanticLayout.repair(symbol, fixture, dom);
          var preview = new dom.SymbolMaster({
            name: 'Migration Preview / ' + fixture.id,
            parent: page,
            frame: {
              x: symbol.frame.x,
              y: symbol.frame.y,
              width: fixture.box.width,
              height: fixture.box.height,
            },
          });
          try {
            var replacement = dom.createLayerFromData(fixture.svg, 'svg');
            if (!replacement)
              throw new Error('SVG import failed: ' + fixture.id);
            replacement.parent = preview;
            replacement.name = 'Production Capture';
            replacement.frame.x = 0;
            replacement.frame.y = 0;
            dom.find('Text', preview).forEach(function (text) {
              text.style.fontFamily = 'system';
            });
            semanticLayout.apply(preview, fixture, dom);
            migratedLayers = migrate(symbol, preview, fixture.id);
          } finally {
            preview.remove();
          }
        }
        symbol.name = fixture.name;
        symbol.background.enabled = false;
        textStyles.apply(symbol, fixture.svg, dom);
        var texts = dom.find('Text', symbol);
        var paths = dom.find('ShapePath', symbol);
        var bitmaps = dom.find('Image', symbol);
        if (texts.length === 0 || paths.length === 0 || bitmaps.length !== 0)
          throw new Error(
            'Form Symbol lost editable text/vectors: ' + fixture.id,
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
          migratedLayers: migratedLayers,
          sourceHash: fixture.sourceHash,
          layoutVersion: LAYOUT_VERSION,
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
