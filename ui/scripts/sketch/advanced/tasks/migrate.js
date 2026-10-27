// Reconcile an edited capture into the published native tree. The preflight
// deliberately requires the same layer topology: positional pairing is safe
// for changed text, geometry, gradients, and checkerboard paints, but it is
// not a stable identity scheme for inserted or removed sibling layers.
function children(layer) {
  return layer.layers || [];
}

function layerPath(parent, index, layer) {
  return parent + '/' + index + ':' + layer.type;
}

function plan(existing, incoming, fixtureId, publishedText) {
  var pairs = [];
  var textIds = [];
  function visit(target, fresh, path) {
    if (target.type !== fresh.type)
      throw new Error('Advanced capture layer type changed at ' + path);
    if (target.type === 'ShapePath' && target.shapeType !== fresh.shapeType)
      throw new Error('Advanced capture path type changed at ' + path);
    var oldChildren = children(target);
    var newChildren = children(fresh);
    if (oldChildren.length !== newChildren.length)
      throw new Error('Advanced capture layer count changed at ' + path);
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
          'Advanced Text may have moved from child ' +
            formerIndex +
            ' to ' +
            index +
            ' at ' +
            path +
            '; explicit override-key migration required',
        );
    });
    if (target.type === 'Text') textIds.push(target.id);
    pairs.push({ target: target, fresh: fresh });
    oldChildren.forEach(function (child, index) {
      visit(child, newChildren[index], layerPath(path, index, child));
    });
  }
  visit(existing, incoming, fixtureId);
  if (
    JSON.stringify(textIds) !==
    JSON.stringify(
      publishedText.map(function (entry) {
        return entry.id;
      }),
    )
  )
    throw new Error('Published Advanced Text IDs disagree: ' + fixtureId);
  return pairs;
}

function sameColor(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function preserveMatchingSwatches(previous, next) {
  if (!previous || !next) return;
  ['fills', 'borders'].forEach(function (kind) {
    var oldPaints = previous[kind] || [];
    var newPaints = next[kind] || [];
    newPaints.forEach(function (paint, index) {
      var old = oldPaints[index];
      if (old && old.swatch && sameColor(old.color, paint.color))
        paint.swatch = old.swatch;
    });
  });
}

function apply(pairs) {
  pairs.forEach(function (pair) {
    var target = pair.target;
    var fresh = pair.fresh;
    preserveMatchingSwatches(target.style, fresh.style);
    target.frame = fresh.frame.toJSON();
    target.style = fresh.style;
    target.rotation = fresh.rotation;
    target.isVisible = fresh.isVisible;
    if (fresh.hasClippingMask !== undefined)
      target.hasClippingMask = fresh.hasClippingMask;
    if (fresh.clippingMaskMode !== undefined)
      target.clippingMaskMode = fresh.clippingMaskMode;
    if (target.type === 'Text') {
      target.text = fresh.text;
      target.style.fontFamily = 'system';
    }
    if (fresh.points) target.points = fresh.points;
    if (fresh.closed !== undefined) target.closed = fresh.closed;
  });
}

module.exports = { apply: apply, plan: plan };
