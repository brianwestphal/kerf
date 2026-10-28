// Reconcile an edited capture into a published native Symbol. The caller
// imports the edited SVG into a temporary preview master and applies the same
// layout; this validates that the preview has the published tree's ordered
// topology (layer and shape types, child counts, no detectable label
// reorder) before changing anything, then updates each published layer in
// place so Symbol, Text override, and layer IDs survive. Unchanged paint
// colors keep their Color Variables; changed ones are left for the asset
// pass to rebind. Extracted from the Forms builder for the families that
// followed it.
function migrationPairs(existing, incoming, fixtureId, family) {
  var pairs = [];
  function visit(oldLayer, newLayer, path) {
    if (oldLayer.type !== newLayer.type)
      throw new Error(
        'Incompatible ' +
          family +
          ' SVG ' +
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
        'Incompatible ' +
          family +
          ' SVG ' +
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
        'Incompatible ' +
          family +
          ' SVG ' +
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
          'Incompatible ' +
            family +
            ' SVG ' +
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
      'Incompatible ' +
        family +
        ' SVG ' +
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

function migrate(existing, incoming, fixtureId, family) {
  // Validate the complete tree before changing any published layer.
  var pairs = migrationPairs(existing, incoming, fixtureId, family);
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
