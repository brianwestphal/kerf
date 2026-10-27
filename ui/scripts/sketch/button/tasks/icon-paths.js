// A fixture's ordered keys identify source SVG paths. Native IDs, rather than
// path position or geometry, decide which consumer override survives an edit.
function paths(icon, fixtureId) {
  if (
    !icon.layers ||
    icon.layers.length !== 1 ||
    !icon.layers[0].layers ||
    !icon.layers[0].layers.every(function (layer) {
      return layer.type === 'ShapePath';
    })
  )
    throw new Error('Unsupported icon path hierarchy: ' + fixtureId);
  return icon.layers[0].layers.slice();
}

function reconcile(existing, incoming, fixtureId, mapping, previous) {
  var source = paths(incoming, fixtureId);
  if (source.length !== mapping.active.length)
    throw new Error('Icon key count differs from source paths: ' + fixtureId);
  if (!existing) {
    source.forEach(function (path, index) {
      path.name = 'Icon Path / ' + mapping.active[index];
      path.nameIsFixed = true;
    });
    return incoming;
  }
  var oldPaths = paths(existing, fixtureId);
  var oldActive = previous && previous.active;
  if (!oldActive) {
    if (oldPaths.length !== source.length)
      throw new Error(
        'Migrate path keys before structural edits: ' + fixtureId,
      );
    oldActive = mapping.active.map(function (key, index) {
      return { key: key, id: oldPaths[index].id };
    });
  }
  var byId = {};
  oldPaths.forEach(function (path) {
    byId[path.id] = path;
  });
  var byKey = {};
  oldActive.forEach(function (entry) {
    if (!byId[entry.id])
      throw new Error(
        'Missing native icon path for ' + entry.key + ': ' + fixtureId,
      );
    byKey[entry.key] = byId[entry.id];
  });
  var retained = {};
  mapping.active.forEach(function (key, index) {
    var target = byKey[key];
    var fresh = source[index];
    if (target) {
      if (target.shapeType !== fresh.shapeType)
        throw new Error('Icon path type changed for ' + key + ': ' + fixtureId);
      target.points = fresh.points;
      target.closed = fresh.closed;
      target.frame = fresh.frame.toJSON();
    } else {
      target = fresh;
      target.parent = existing.layers[0];
    }
    target.name = 'Icon Path / ' + key;
    target.nameIsFixed = true;
    retained[target.id] = true;
  });
  oldPaths.forEach(function (path) {
    if (!retained[path.id]) path.remove();
  });
  mapping.active.forEach(function (key, index) {
    var target = byKey[key] || source[index];
    target.index = index;
  });
  existing.layers[0].frame = incoming.layers[0].frame.toJSON();
  existing.frame = incoming.frame.toJSON();
  return existing;
}

module.exports = { reconcile: reconcile, paths: paths };
