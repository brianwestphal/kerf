function readJSON(path) {
  var text = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!text) throw new Error('Cannot read ' + path);
  return JSON.parse(String(text));
}

function describe(instance, sourceCase) {
  var override = instance.overrides.filter(function (item) {
    return item.property === 'stringValue';
  })[0];
  var expanded = instance.expandedLayers;
  var label = expanded.filter(function (item) {
    return item.name === 'Label';
  })[0];
  var icon = expanded.filter(function (item) {
    return item.name === 'Icon';
  })[0];
  if (!override || !label || !!icon !== sourceCase.icon)
    throw new Error('Missing fill case layer or override: ' + sourceCase.id);
  return {
    id: sourceCase.id,
    instanceId: instance.id,
    symbolId: instance.symbolId,
    frame: instance.frame.toJSON(),
    label: override.value,
    labelFrame: label.frame.toJSON(),
    iconFrame: icon ? icon.frame.toJSON() : null,
    linked: !!instance.master.getLibrary(),
  };
}

module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var source = readJSON(parameters.fillLayoutPath);
  if (source.cases.length !== 36)
    return done(new Error('Expected 36 real Button(fill:true) cases.'));
  try {
    var document = session.createDocument();
    document.selectedPage.name = 'Fill Width Tests';
    var library = session.library(parameters.libraryPath);
    var refs = library.getImportableSymbolReferencesForDocument(document);
    var masters = {};
    var report = [];
    var transitions = [];
    source.cases.forEach(function (test, index) {
      session.check();
      var master = masters[test.variantId];
      if (!master) {
        var ref = refs.filter(function (item) {
          return item.name === test.variantName;
        })[0];
        if (!ref) throw new Error('Missing fill Symbol: ' + test.variantId);
        master = ref.import();
        masters[test.variantId] = master;
      }
      var instance = master.createNewInstance();
      instance.parent = document.selectedPage;
      instance.name = test.id;
      var override = instance.overrides.filter(function (item) {
        return item.property === 'stringValue';
      })[0];
      if (!override) throw new Error('Missing editable label: ' + test.id);
      override.value = test.displayLabel;
      instance.resizeWithSmartLayout();
      instance.horizontalSizing = dom.FlexSizing.Fixed;
      instance.frame.width = test.width;
      instance.frame.x = (index % 3) * 340;
      instance.frame.y = Math.floor(index / 3) * 80;
      var current = describe(instance, test);
      if (!current.linked || current.frame.width !== test.width)
        throw new Error('Fill width or Library link failed: ' + test.id);
      var labelFrame = current.labelFrame;
      var iconFrame = current.iconFrame;
      var start = iconFrame ? iconFrame.x : labelFrame.x;
      var end = labelFrame.x + labelFrame.width;
      if (
        labelFrame.y < 0 ||
        labelFrame.y + labelFrame.height > 44 ||
        start < 8 ||
        end > test.width - 8 ||
        Math.abs((start + end) / 2 - test.width / 2) > 1
      )
        throw new Error(
          'Fill content spilled or lost centering: ' +
            test.id +
            ' ' +
            JSON.stringify(current),
        );
      if (
        iconFrame &&
        (iconFrame.width !== 16 ||
          iconFrame.height !== 16 ||
          Math.abs(labelFrame.x - iconFrame.x - 24) > 0.01)
      )
        throw new Error('Fill icon size or gap changed: ' + test.id);
      if (test.labelCase === 'long' && test.sizeCase === 'below') {
        // Exercise a designer's real cycle: widen, edit the override, restore
        // the full source label, return to Fit, then narrow the saved specimen.
        var narrow = current;
        var oldX = instance.frame.x;
        var oldY = instance.frame.y;
        instance.frame.width = Math.ceil(test.intrinsicWidth + 64);
        override.value = test.sourceLabel;
        instance.resizeWithSmartLayout();
        var widened = describe(instance, test);
        override.value = 'Export Updated';
        instance.resizeWithSmartLayout();
        var edited = describe(instance, test);
        override.value = test.sourceLabel;
        instance.horizontalSizing = dom.FlexSizing.Fit;
        instance.resizeWithSmartLayout();
        var fit = describe(instance, test);
        if (
          widened.label !== test.sourceLabel ||
          edited.label !== 'Export Updated' ||
          fit.label !== test.sourceLabel ||
          fit.frame.width < test.intrinsicWidth - 6
        )
          throw new Error('Fill resize and Fit reset failed: ' + test.id);
        transitions.push({
          id: test.id,
          narrow: narrow.frame,
          widened: widened.frame,
          edited: edited.frame,
          fit: fit.frame,
        });
        override.value = test.displayLabel;
        instance.resizeWithSmartLayout();
        instance.horizontalSizing = dom.FlexSizing.Fixed;
        instance.frame.width = test.width;
        instance.frame.x = oldX;
        instance.frame.y = oldY;
        current = describe(instance, test);
      }
      report.push(current);
      dom.export(instance, {
        formats: 'png',
        scales: '2',
        output: parameters.fillExportsPath,
        filename: test.id,
        overwriting: true,
      });
    });
    session.saveDocument(
      document,
      parameters.fillDocumentPath,
      function (error) {
        if (error) return done(error);
        try {
          session.closeDocument(document);
          session.openDocument(
            parameters.fillDocumentPath,
            function (openError, reopened) {
              if (openError) return done(openError);
              try {
                var saved = dom.find('SymbolInstance', reopened);
                if (saved.length !== 36)
                  throw new Error('Fill round trip lost instances.');
                var persisted = source.cases.map(function (test) {
                  var instance = saved.filter(function (item) {
                    return item.name === test.id;
                  })[0];
                  if (!instance)
                    throw new Error('Missing saved fill case: ' + test.id);
                  var current = describe(instance, test);
                  if (current.label !== test.displayLabel || !current.linked)
                    throw new Error(
                      'Fill override or Library link changed: ' + test.id,
                    );
                  return current;
                });
                done(null, {
                  cases: report,
                  reopened: persisted,
                  transitions: transitions,
                });
              } catch (failure) {
                done(failure);
              }
            },
          );
        } catch (failure) {
          done(failure);
        }
      },
    );
  } catch (failure) {
    done(failure);
  }
};
