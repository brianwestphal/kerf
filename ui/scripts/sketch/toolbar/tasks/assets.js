function readJSON(path) {
  var content = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!content) throw new Error('Cannot read ' + path);
  return JSON.parse(String(content));
}

var COLORS = {
  light: {
    text: '#1d1d1fff',
    'text-quiet': '#646469ff',
    'neutral-on-quiet': '#626267ff',
    'on-loud': '#ffffffff',
    surface: '#ffffffff',
    'brand-fill-loud': '#0075dbff',
    'brand-input': '#0a84ffff',
    'selected-surface': '#d6e9f9ff',
    'selected-icon': '#a6cff2ff',
    'brand-icon': '#0c62f3ff',
    'brand-on-quiet': '#1a5dcfff',
    'success-on-quiet': '#007f2eff',
    'warning-on-quiet': '#966200ff',
    'danger-fill-loud': '#be060bff',
    'danger-on-quiet': '#c20b20ff',
    'neutral-fill-loud': '#48484aff',
    'neutral-border-normal': '#00001c2e',
    'success-fill-loud': '#34c759ff',
  },
  dark: {
    text: '#f5f5f7ff',
    'text-quiet': '#aeaeb2ff',
    'neutral-on-quiet': '#c2c2c6ff',
    'on-loud': '#1c1c1eff',
    surface: '#1c1c1eff',
    'brand-fill-loud': '#64d2ffff',
    'brand-input': '#0a84ffff',
    'selected-surface': '#283942ff',
    'selected-icon': '#355c6dff',
    'brand-icon': '#8acbffff',
    'success-on-quiet': '#63e685ff',
    'warning-on-quiet': '#ffd84aff',
    'danger-fill-loud': '#fd6265ff',
    'danger-on-quiet': '#ff8588ff',
    'neutral-fill-loud': '#e5e5eaff',
    'neutral-border-normal': '#fdfdff32',
    'success-fill-loud': '#34c759ff',
  },
};

module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var fixtures = readJSON(parameters.fixturesPath);
  var manifest = readJSON(parameters.manifestPath);
  var oldAssets = manifest.assets || {};
  session.openDocument(parameters.libraryPath, function (openError, document) {
    if (openError) return done(openError);
    try {
      var assets = {};
      var counts = { text: 0, fills: 0, borders: 0 };
      function swatch(theme, role) {
        var key = theme + '.' + role;
        if (assets[key]) return assets[key].object;
        var wanted = 'Kerf/Toolbar/' + theme + '/' + role;
        var color = COLORS[theme][role];
        var old = oldAssets[key];
        var found =
          old &&
          document.swatches.filter(function (item) {
            return item.id === old.id;
          })[0];
        if (old && !found)
          throw new Error(
            'Published toolbar/navigation Color Variable missing: ' + key,
          );
        if (!found) {
          if (
            document.swatches.some(function (item) {
              return item.name === wanted;
            })
          )
            throw new Error(
              'Toolbar/navigation Color Variable name collision: ' + wanted,
            );
          document.swatches.push({ name: wanted, color: color });
          found = document.swatches.filter(function (item) {
            return item.name === wanted;
          })[0];
        }
        if (
          document.swatches.some(function (item) {
            return item.name === wanted && item.id !== found.id;
          })
        )
          throw new Error(
            'Duplicate toolbar/navigation Color Variable: ' + wanted,
          );
        found.name = wanted;
        found.color = color;
        assets[key] = {
          id: found.id,
          name: wanted,
          color: color,
          object: found,
        };
        return found;
      }
      function roleOf(theme, color, text) {
        if (!color) return null;
        var normalized = String(color).toLowerCase();
        var candidates = Object.keys(COLORS[theme]);
        if (text)
          candidates = candidates.filter(function (key) {
            return key !== 'surface' && key !== 'neutral-border-normal';
          });
        else
          candidates = candidates.filter(function (key) {
            return key !== 'surface' && key !== 'on-loud' && key !== 'text';
          });
        return (
          candidates.filter(function (key) {
            return COLORS[theme][key] === normalized;
          })[0] || null
        );
      }
      fixtures.forEach(function (fixture) {
        session.check();
        var old = manifest.symbols[fixture.id];
        var master = dom.find('SymbolMaster', document).filter(function (item) {
          return item.symbolId === old.symbolId;
        })[0];
        if (!master)
          throw new Error(
            'Missing toolbar/navigation Symbol for assets: ' + fixture.id,
          );
        dom.find('Text', master).forEach(function (layer) {
          layer.style.fills.forEach(function (fill) {
            var role = roleOf(fixture.theme, fill.color, true);
            if (role) {
              fill.swatch = swatch(fixture.theme, role);
              counts.text++;
            }
          });
        });
        dom.find('ShapePath', master).forEach(function (layer) {
          layer.style.fills.forEach(function (fill) {
            var role = roleOf(fixture.theme, fill.color, false);
            if (role) {
              fill.swatch = swatch(fixture.theme, role);
              counts.fills++;
            }
          });
          layer.style.borders.forEach(function (border) {
            var role = roleOf(fixture.theme, border.color, false);
            if (role) {
              border.swatch = swatch(fixture.theme, role);
              counts.borders++;
            }
          });
        });
      });
      if (
        counts.text < 70 ||
        counts.fills < 3 ||
        Object.keys(assets).length < 8
      )
        throw new Error(
          'Toolbar/navigation shared assets did not bind across families: ' +
            JSON.stringify({ counts: counts, swatches: Object.keys(assets) }),
        );
      var report = { swatches: {}, bindings: counts };
      Object.keys(assets).forEach(function (key) {
        var item = assets[key];
        report.swatches[key] = {
          id: item.id,
          name: item.name,
          color: item.color,
        };
      });
      session.saveDocument(
        document,
        parameters.libraryPath,
        function (error) {
          done(error, report);
        },
        { inPlace: true },
      );
    } catch (failure) {
      done(failure);
    }
  });
};
