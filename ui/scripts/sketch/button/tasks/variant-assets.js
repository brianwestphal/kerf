function createVariantAssets(document, dom, previous) {
  var report = { swatches: {}, layerStyles: {}, textStyles: {} };

  function name(fixture, role) {
    return 'Kerf/' + fixture.name.split(' / ').join('/') + '/' + role;
  }

  function swatch(fixture, role, color) {
    var key = fixture.id + '.' + role;
    if (report.swatches[key]) return report.swatches[key].object;
    var wanted = name(fixture, role);
    var prior = previous.swatches && previous.swatches[key];
    var found =
      prior &&
      document.swatches.filter(function (item) {
        return item.id === prior.id;
      })[0];
    if (prior && !found)
      throw new Error('Missing variant Color Variable: ' + key);
    if (!found) {
      if (
        document.swatches.some(function (item) {
          return item.name === wanted;
        })
      )
        throw new Error('Variant Color Variable collision: ' + wanted);
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
      throw new Error('Duplicate variant Color Variable: ' + wanted);
    found.name = wanted;
    found.color = color;
    report.swatches[key] = {
      id: found.id,
      name: wanted,
      color: color,
      object: found,
    };
    return found;
  }

  function shared(kind, fixture, role, layer) {
    var key = fixture.id + '.' + role;
    var wanted = name(fixture, role);
    var collection =
      kind === 'textStyles'
        ? document.sharedTextStyles
        : document.sharedLayerStyles;
    var prior = previous[kind] && previous[kind][key];
    var found =
      prior &&
      collection.filter(function (item) {
        return item.id === prior.id;
      })[0];
    if (prior && !found)
      throw new Error('Missing variant shared style: ' + key);
    if (!found) {
      if (
        collection.some(function (item) {
          return item.name === wanted;
        })
      )
        throw new Error('Variant shared style collision: ' + wanted);
      found = dom.SharedStyle.fromStyle({
        name: wanted,
        style: layer.style,
        document: document,
      });
    }
    if (
      collection.some(function (item) {
        return item.name === wanted && item.id !== found.id;
      })
    )
      throw new Error('Duplicate variant shared style: ' + wanted);
    found.name = wanted;
    found.style = layer.style;
    layer.sharedStyle = found;
    report[kind][key] = { id: found.id, name: wanted };
    return found;
  }

  function result() {
    var saved = {
      swatches: {},
      layerStyles: report.layerStyles,
      textStyles: report.textStyles,
    };
    Object.keys(report.swatches).forEach(function (key) {
      var entry = report.swatches[key];
      saved.swatches[key] = {
        id: entry.id,
        name: entry.name,
        color: entry.color,
      };
    });
    return saved;
  }

  return { swatch: swatch, shared: shared, result: result };
}

module.exports = { createVariantAssets: createVariantAssets };
