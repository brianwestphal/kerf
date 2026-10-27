module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var cases = [
    { name: 'hug-long', label: 'Save All Pending Changes' },
    { name: 'wide-short', label: 'Go', width: 280 },
    { name: 'wide-long', label: 'Save All Pending Changes', width: 320 },
    { name: 'tall', label: 'Save Draft', width: 280, height: 64 },
    { name: 'narrow', label: 'Go', width: 100 },
  ];
  try {
    var document = session.createDocument();
    document.selectedPage.name = 'Resizing Tests';
    var library = session.library(parameters.libraryPath);
    var refs = library.getImportableSymbolReferencesForDocument(document);
    if (refs.length !== 6) throw new Error('Expected six importable Symbols.');
    var report = [];
    refs.forEach(function (ref, symbolIndex) {
      session.check();
      var master = ref.import();
      cases.forEach(function (test, caseIndex) {
        session.check();
        var instance = master.createNewInstance();
        instance.parent = document.selectedPage;
        var override = instance.overrides.filter(function (item) {
          return item.property === 'stringValue';
        })[0];
        if (!override) throw new Error('Missing string override.');
        override.value = test.label;
        instance.resizeWithSmartLayout();
        if (test.width) {
          instance.horizontalSizing = dom.FlexSizing.Fixed;
          instance.frame.width = test.width;
        }
        if (test.height) {
          instance.verticalSizing = dom.FlexSizing.Fixed;
          instance.frame.height = test.height;
        }
        instance.frame.x = caseIndex * 380;
        instance.frame.y = symbolIndex * 130;
        instance.name = ref.name + ' / ' + test.name;
        var current = instance.overrides.filter(function (item) {
          return item.property === 'stringValue';
        })[0];
        report.push({
          name: ref.name,
          case: test.name,
          id: instance.id,
          symbolId: instance.symbolId,
          label: test.label,
          frame: instance.frame.toJSON(),
          textFrame: current.getFrame().toJSON(),
          horizontalSizing: instance.horizontalSizing,
          verticalSizing: instance.verticalSizing,
          linked: !!master.getLibrary(),
          expanded: instance.expandedLayers.map(function (layer) {
            return {
              name: layer.name,
              type: layer.type,
              frame: layer.frame.toJSON(),
              text: layer.text,
              layers: layer.layers
                ? layer.layers.map(function (child) {
                    return { name: child.name, frame: child.frame.toJSON() };
                  })
                : [],
            };
          }),
        });
        dom.export(instance, {
          formats: 'png',
          scales: '2',
          output: parameters.resizeExportsPath,
          filename: 'symbol-' + symbolIndex + '-' + test.name,
          overwriting: true,
        });
      });
    });
    if (
      report.length !== 30 ||
      report.some(function (item) {
        return !item.linked;
      })
    )
      throw new Error('Resize cases or Library links are missing.');
    session.saveDocument(
      document,
      parameters.resizingPath,
      function (saveError) {
        if (saveError) return done(saveError);
        try {
          session.closeDocument(document);
          session.openDocument(
            parameters.resizingPath,
            function (reopenError, reopened) {
              if (reopenError) return done(reopenError);
              try {
                var persisted = dom
                  .find('SymbolInstance', reopened)
                  .map(function (item) {
                    var override = item.overrides.filter(function (entry) {
                      return entry.property === 'stringValue';
                    })[0];
                    return {
                      id: item.id,
                      name: item.name,
                      frame: item.frame.toJSON(),
                      label: override.value,
                      textFrame: override.getFrame().toJSON(),
                    };
                  });
                if (persisted.length !== 30)
                  throw new Error('Resize round trip lost instances.');
                done(null, { cases: report, reopened: persisted });
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
