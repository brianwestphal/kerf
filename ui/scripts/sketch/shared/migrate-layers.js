// Reconcile an edited capture into a published native Symbol. The caller
// imports the edited SVG into a temporary preview master and applies the same
// layout; this validates that the preview has the published tree's ordered
// topology (layer and shape types, child counts, no detectable label
// reorder) before changing anything, then updates each published layer in
// place so Symbol, Text override, and layer IDs survive. Unchanged paint
// colors keep their Color Variables; changed ones are left for the asset
// pass to rebind. Extracted from the Forms builder for the families that
// followed it.
//
// Where an edit only adds non-Text layers (a capture fix that restores icon
// dots Sketch used to drop), siblings are aligned by signature instead of
// position: every published child must still match an unchanged sibling, and
// each added layer is inserted at its new position with a fresh ID while
// every existing layer keeps its own.
function hasText(layer) {
  return layer.type === 'Text' || (layer.layers || []).some(hasText);
}

function signature(layer) {
  return [
    layer.type,
    layer.shapeType || '',
    Math.round(layer.frame.width) + 'x' + Math.round(layer.frame.height),
    (layer.layers || []).length,
  ].join(':');
}

// Longest common subsequence of sibling signatures, as index pairs.
function align(oldChildren, newChildren) {
  var oldKeys = oldChildren.map(signature);
  var newKeys = newChildren.map(signature);
  var table = [];
  for (var i = 0; i <= oldKeys.length; i++) {
    table.push([]);
    for (var j = 0; j <= newKeys.length; j++)
      table[i].push(
        i === 0 || j === 0
          ? 0
          : oldKeys[i - 1] === newKeys[j - 1]
            ? table[i - 1][j - 1] + 1
            : Math.max(table[i - 1][j], table[i][j - 1]),
      );
  }
  var matches = [];
  for (var a = oldKeys.length, b = newKeys.length; a > 0 && b > 0;) {
    if (oldKeys[a - 1] === newKeys[b - 1]) {
      matches.unshift([a - 1, b - 1]);
      a--;
      b--;
    } else if (table[a - 1][b] >= table[a][b - 1]) a--;
    else b--;
  }
  return matches;
}

function migrationPairs(existing, incoming, fixtureId, family) {
  var pairs = [];
  var insertions = [];
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
    if (oldChildren.length !== newChildren.length) {
      var matches = align(oldChildren, newChildren);
      var added = newChildren.filter(function (child, index) {
        return !matches.some(function (match) {
          return match[1] === index;
        });
      });
      if (matches.length === oldChildren.length && !added.some(hasText)) {
        pairs.push({ existing: oldLayer, incoming: newLayer });
        newChildren.forEach(function (child, index) {
          if (added.indexOf(child) >= 0)
            insertions.push({ parent: oldLayer, layer: child, index: index });
        });
        matches.forEach(function (match) {
          visit(
            oldChildren[match[0]],
            newChildren[match[1]],
            path + '/' + match[0],
          );
        });
        return;
      }
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
    }
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
  pairs.insertions = insertions;
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
  // Insert added layers in ascending position so each lands at the index it
  // has in the edited capture.
  pairs.insertions.forEach(function (insertion) {
    insertion.layer.parent = insertion.parent;
    insertion.layer.index = insertion.index;
  });
  existing.frame.width = incoming.frame.width;
  existing.frame.height = incoming.frame.height;
  return pairs.length + pairs.insertions.length;
}

module.exports.migrationPairs = migrationPairs;
module.exports.migrate = migrate;

function textLayers(layer) {
  var found = [];
  (function walk(node) {
    if (node.type === 'Text') found.push(node);
    (node.layers || []).forEach(walk);
  })(layer);
  return found;
}

/**
 * Fallback for an edit whose layer tree cannot be mapped layer by layer, for
 * example a capture fix that restores a dot Sketch used to drop and, with it,
 * the grouping the import had collapsed around the missing path. Consumers
 * link to the master's Symbol ID and override its Text layers, so when the
 * ordered Text sequence still matches, keep the master and move each
 * published Text layer into the fresh tree in place of its counterpart; every
 * other layer is replaced. Throws before mutating if the Text sequence
 * changed shape or a label may have moved.
 */
function retree(existing, incoming, fixtureId, family) {
  var oldTexts = textLayers(existing);
  var newTexts = textLayers(incoming);
  function reject(reason) {
    throw new Error(
      'Incompatible ' + family + ' SVG ' + fixtureId + ': ' + reason,
    );
  }
  if (oldTexts.length !== newTexts.length)
    reject(
      'Text count ' +
        oldTexts.length +
        ' -> ' +
        newTexts.length +
        ' on re-tree',
    );
  newTexts.forEach(function (fresh, index) {
    if (oldTexts[index].text === fresh.text) return;
    oldTexts.forEach(function (previous, candidate) {
      if (candidate !== index && previous.text === fresh.text)
        reject(
          'text may have moved from ' +
            candidate +
            ' to ' +
            index +
            '; explicit override-key migration required',
        );
    });
  });
  if (existing.layers.length !== 1 || incoming.layers.length !== 1)
    reject('expected one capture root on re-tree');
  newTexts.forEach(function (fresh, index) {
    var target = oldTexts[index];
    preserveMatchingSwatches(target.style, fresh.style);
    target.parent = fresh.parent;
    target.index = fresh.index;
    target.style = fresh.style;
    target.frame = fresh.frame.toJSON();
    target.text = fresh.text;
    target.horizontalSizing = fresh.horizontalSizing;
    target.horizontalPins = fresh.horizontalPins;
    target.verticalSizing = fresh.verticalSizing;
    target.verticalPins = fresh.verticalPins;
    fresh.remove();
  });
  existing.layers[0].remove();
  incoming.layers[0].parent = existing;
  existing.frame.width = incoming.frame.width;
  existing.frame.height = incoming.frame.height;
  return textLayers(existing).length;
}

module.exports.retree = retree;
