// Production text uses the platform system font (`system-ui`, SF on macOS).
// Sketch stores its own "system" family as a nameless font descriptor that the
// Embed Fonts panel reports as Invalid Font, so the Library names variable
// SF Pro, which keeps the system font's optical sizes and tracking. Sketch
// resolves weight 8 in that family to its Expanded Semibold instance, so
// `normalize` moves any Expanded face back to the normal-width one.
var family = 'SF Pro';

// Accepts one Text layer, or any container to normalize its Text layers.
function normalize(dom, root) {
  var texts = root.type === 'Text' ? [root] : dom.find('Text', root);
  texts.forEach(function (text) {
    var font = text.sketchObject.font();
    var name = String(font.fontName());
    if (name.indexOf('SFPro-Expanded') !== 0) return;
    var normal = NSFont.fontWithName_size(
      'SFPro-' + name.slice('SFPro-Expanded'.length),
      font.pointSize(),
    );
    if (!normal) throw new Error('Missing normal-width SF Pro face: ' + name);
    var fixedWidth = text.fixedWidth ? text.frame.width : null;
    text.sketchObject.setFont(normal);
    if (fixedWidth === null) text.adjustToFit();
  });
}

module.exports = { family: family, normalize: normalize };
