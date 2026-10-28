// Merge the six family Libraries into one new Kerf UI Library document. Every
// master, Symbol, and descendant layer keeps its family ID (the family
// pipelines already keep those stable), so unified identities are stable by
// construction. Cross-document copies drop Color Variable references, so
// every paint is rebound to a unified swatch; shared styles are copied with
// their IDs so layer links keep resolving.
function title(words) {
  return words
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Swatch names put the theme in different places ('Kerf/Forms/light/text',
// 'Kerf/Light/Neutral/On Quiet', 'Kerf/Button/Badge Brand/Dark/Fill'); all
// normalize to a theme plus a role, dropping the family segment.
function swatchKey(name, familyNames) {
  var parts = name.split('/').slice(1);
  var themeIndex = parts.findIndex(function (part) {
    return /^(light|dark)$/i.test(part);
  });
  if (themeIndex < 0)
    throw new Error('Color Variable without a theme: ' + name);
  var rest = parts.filter(function (part, index) {
    return index !== themeIndex && familyNames.indexOf(part) < 0;
  });
  return { theme: title(parts[themeIndex]), role: title(rest.join(' ')) };
}

function paints(style) {
  return ['fills', 'borders'].reduce(function (all, kind) {
    return all.concat(
      (style[kind] || []).map(function (paint, index) {
        return { kind: kind, index: index, paint: paint };
      }),
    );
  }, []);
}

// Catalog page layout: masters in name order (grouped by component), flowing
// in columns, with a Light region and a Dark region on a dark backing surface
// so dark-theme masters stay legible. Labels and the backing are page layers
// outside every Symbol, so they carry no Symbol identity.
var GAP = 32;
var COLUMN_HEIGHT = 2400;

function flow(masters, originX) {
  var x = originX;
  var y = 80;
  var columnWidth = 0;
  var right = originX;
  masters.forEach(function (master) {
    if (y > 80 && y + master.frame.height > COLUMN_HEIGHT) {
      x += columnWidth + GAP * 2;
      y = 80;
      columnWidth = 0;
    }
    master.frame = {
      x: x,
      y: y,
      width: master.frame.width,
      height: master.frame.height,
    };
    y += master.frame.height + GAP;
    columnWidth = Math.max(columnWidth, master.frame.width);
    right = Math.max(right, x + master.frame.width);
  });
  return right;
}

function label(page, text, x, color, dom) {
  var layer = new dom.Text({
    text: text,
    parent: page,
    frame: { x: x, y: 0, width: 400, height: 40 },
  });
  layer.name = text + ' Label';
  layer.style.fontSize = 32;
  layer.style.fontWeight = 8;
  layer.style.textColor = color;
}

function layoutPage(page, dom) {
  var masters = dom.find('SymbolMaster', page).sort(function (a, b) {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
  var light = masters.filter(function (master) {
    return / Light$/.test(master.name);
  });
  var dark = masters.filter(function (master) {
    return / Dark$/.test(master.name);
  });
  var lightRight = flow(light, 0);
  var darkLeft = lightRight + GAP * 6;
  var darkRight = flow(dark, darkLeft);
  var bottom = masters.reduce(function (max, master) {
    return Math.max(max, master.frame.y + master.frame.height);
  }, 0);
  var backing = new dom.ShapePath({
    name: 'Dark Surface',
    parent: page,
    frame: {
      x: darkLeft - GAP,
      y: -GAP,
      width: darkRight - darkLeft + GAP * 2,
      height: bottom + GAP * 2,
    },
    style: { fills: ['#1c1c1eff'], borders: [] },
  });
  backing.index = 0;
  backing.locked = true;
  label(page, 'Light', 0, '#1d1d1fff', dom);
  label(page, 'Dark', darkLeft, '#f5f5f7ff', dom);
}

module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var families = parameters.families;
  var familyNames = families.map(function (family) {
    return family.swatchSegment;
  });
  var sources = [];

  function openNext() {
    if (sources.length === families.length) return build();
    var family = families[sources.length];
    session.openDocument(family.libraryPath, function (error, document) {
      if (error) return done(error);
      sources.push({ family: family, document: document });
      openNext();
    });
  }

  function build() {
    try {
      session.check();
      var unified = session.createDocument();
      var initialPage = unified.selectedPage;

      // Plan unified swatches: one per theme and role when families agree on
      // the color, family-qualified when they do not.
      var groups = {};
      sources.forEach(function (source) {
        source.document.swatches.forEach(function (swatch) {
          var key = swatchKey(swatch.name, familyNames);
          var id = key.theme + '/' + key.role;
          var color = String(swatch.color).toLowerCase();
          groups[id] = groups[id] || { key: key, colors: {} };
          var entry = (groups[id].colors[color] = groups[id].colors[color] || {
            color: color,
            sourceIds: [],
            families: [],
          });
          entry.sourceIds.push(swatch.id);
          if (entry.families.indexOf(source.family.title) < 0)
            entry.families.push(source.family.title);
        });
      });
      var planned = [];
      Object.keys(groups).forEach(function (id) {
        var group = groups[id];
        var colors = Object.keys(group.colors);
        colors.forEach(function (color) {
          var entry = group.colors[color];
          var name = 'Kerf/' + group.key.theme + '/' + group.key.role;
          if (colors.length > 1) name += ' · ' + entry.families.join(', ');
          planned.push({
            id: entry.sourceIds[0],
            name: name,
            color: color,
            sourceIds: entry.sourceIds,
          });
        });
      });
      planned.sort(function (a, b) {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      });
      unified.swatches = planned.map(function (entry) {
        return { name: entry.name, color: entry.color };
      });
      var bySource = {};
      unified.swatches.forEach(function (swatch, index) {
        swatch.sketchObject.setObjectID(planned[index].id);
        planned[index].sourceIds.forEach(function (sourceId) {
          bySource[sourceId] = swatch;
        });
      });

      function rebind(sourceStyle, targetStyle, counts) {
        var sourcePaints = paints(sourceStyle);
        var targetPaints = paints(targetStyle);
        sourcePaints.forEach(function (entry, index) {
          if (!entry.paint.swatch) return;
          counts.source++;
          var swatch = bySource[entry.paint.swatch.id];
          if (!swatch)
            throw new Error(
              'Unmapped Color Variable: ' + entry.paint.swatch.name,
            );
          targetPaints[index].paint.swatch = swatch;
          counts.target++;
        });
      }

      // Shared styles keep their IDs; their paints are rebound like layers.
      var styles = { layer: 0, text: 0 };
      var styleCounts = { source: 0, target: 0 };
      sources.forEach(function (source) {
        [
          ['sharedLayerStyles', 'layer'],
          ['sharedTextStyles', 'text'],
        ].forEach(function (pair) {
          source.document[pair[0]].forEach(function (shared) {
            unified[pair[0]].push({ name: shared.name, style: shared.style });
            var copy = unified[pair[0]][unified[pair[0]].length - 1];
            copy.sketchObject.setObjectID(shared.id);
            rebind(shared.style, copy.style, styleCounts);
            styles[pair[1]]++;
          });
        });
      });

      var report = {
        families: [],
        swatches: planned,
        styles: styles,
        symbols: [],
      };
      sources.forEach(function (source) {
        session.check();
        var page = new dom.Page({ name: source.family.title, parent: unified });
        var counts = { source: 0, target: 0, masters: 0, styleLinks: 0 };
        function align(sourceLayer, targetLayer) {
          targetLayer.sketchObject.setObjectID(sourceLayer.id);
          if (sourceLayer.style)
            rebind(sourceLayer.style, targetLayer.style, counts);
          if (sourceLayer.sharedStyleId) {
            if (targetLayer.sharedStyleId !== sourceLayer.sharedStyleId)
              throw new Error('Shared style link lost: ' + sourceLayer.name);
            counts.styleLinks++;
          }
          var sourceChildren = sourceLayer.layers || [];
          var targetChildren = targetLayer.layers || [];
          if (sourceChildren.length !== targetChildren.length)
            throw new Error('Copied layer tree differs: ' + sourceLayer.name);
          sourceChildren.forEach(function (child, index) {
            align(child, targetChildren[index]);
          });
        }
        dom.find('SymbolMaster', source.document).forEach(function (master) {
          var copy = master.duplicate();
          copy.parent = page;
          copy.sketchObject.setSymbolID(master.symbolId);
          align(master, copy);
          counts.masters++;
          report.symbols.push({
            family: source.family.key,
            name: copy.name,
            symbolId: copy.symbolId,
            layerId: copy.id,
            text: dom.find('Text', copy).map(function (text) {
              return { id: text.id, value: text.text };
            }),
          });
        });
        layoutPage(page, dom);
        report.families.push({
          key: source.family.key,
          title: source.family.title,
          masters: counts.masters,
          boundPaints: { source: counts.source, unified: counts.target },
          sharedStyleLinks: counts.styleLinks,
        });
        dom.export(page, {
          formats: 'png',
          scales: '0.5',
          output: parameters.pagesPath,
          filename: source.family.key,
          overwriting: true,
        });
      });
      report.styleBoundPaints = styleCounts;
      initialPage.remove();
      sources.forEach(function (source) {
        session.closeDocument(source.document);
      });
      session.saveDocument(unified, parameters.libraryPath, function (error) {
        done(error, report);
      });
    } catch (error) {
      done(error);
    }
  }

  openNext();
};
