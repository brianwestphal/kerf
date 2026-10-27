module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  session.openDocument(
    parameters.libraryPath,
    function (openError, libraryDocument) {
      if (openError) return done(openError);
      try {
        session.check();
        var masters = dom.find('SymbolMaster', libraryDocument);
        if (masters.length !== 6)
          throw new Error('Expected six saved Symbols.');
        var report = {
          reopenedSymbols: masters.length,
          editableText: dom.find('Text', libraryDocument).length,
          bitmaps: dom.find('Image', libraryDocument).length,
        };
        if (report.editableText !== 6 || report.bitmaps !== 0)
          throw new Error(
            'Saved library lost editable text or gained bitmaps.',
          );
        session.closeDocument(libraryDocument);
        var consumer = session.createDocument();
        consumer.selectedPage.name = 'Library Instances';
        var library = session.library(parameters.libraryPath);
        var refs = library.getImportableSymbolReferencesForDocument(consumer);
        if (refs.length !== 6)
          throw new Error('Expected six importable Symbols.');
        report.importableSymbols = refs.length;
        report.instances = [];
        refs.forEach(function (ref, index) {
          session.check();
          var master = ref.import();
          var instance = master.createNewInstance();
          instance.parent = consumer.selectedPage;
          instance.frame.x = (index % 3) * 250;
          instance.frame.y = Math.floor(index / 3) * 150;
          var override = instance.overrides.filter(function (item) {
            return item.property === 'stringValue';
          })[0];
          if (!override) throw new Error('Missing text override.');
          override.value =
            master.name.indexOf('Secondary') >= 0 ? 'Done' : 'Save Draft';
          instance.resizeWithSmartLayout();
          report.instances.push({
            name: instance.name,
            id: instance.id,
            linked: !!master.getLibrary(),
            override: override.value,
            masterText: dom.find('Text', master)[0].text,
          });
          dom.export(instance, {
            formats: 'png',
            scales: '2',
            output: parameters.consumerExportsPath,
            filename: 'instance-' + index,
            overwriting: true,
          });
        });
        session.saveDocument(
          consumer,
          parameters.consumerPath,
          function (saveError) {
            if (saveError) return done(saveError);
            try {
              session.closeDocument(consumer);
              session.openDocument(
                parameters.consumerPath,
                function (reopenError, reopened) {
                  if (reopenError) return done(reopenError);
                  try {
                    report.reopenedInstances = dom
                      .find('SymbolInstance', reopened)
                      .map(function (item) {
                        return {
                          name: item.name,
                          overrides: item.overrides
                            .filter(function (override) {
                              return override.property === 'stringValue';
                            })
                            .map(function (override) {
                              return override.value;
                            }),
                        };
                      });
                    if (
                      report.reopenedInstances.length !== 6 ||
                      report.instances.some(function (item) {
                        return !item.linked;
                      })
                    )
                      throw new Error(
                        'Library link or consumer round trip failed.',
                      );
                    done(null, report);
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
    },
  );
};
