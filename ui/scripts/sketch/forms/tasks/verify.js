function readJSON(path) {
  var content = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!content) throw new Error('Cannot read ' + path);
  return JSON.parse(String(content));
}

module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var fixtures = readJSON(parameters.fixturesPath);
  var manifestFile = readJSON(parameters.manifestPath);
  var manifest = manifestFile.symbols;
  var representatives = {
    'split-button': 'tones-deploy',
    'text-field': 'labeled-project-name',
    checkbox: 'states-include-release',
    'checkbox-group': 'vertical-notification-channels',
    'radio-group': 'vertical-layout-density',
    switch: 'states-live-updates',
  };
  var selected = fixtures.filter(function (fixture) {
    return (
      fixture.id.indexOf(
        fixture.component + '-' + representatives[fixture.component] + '-',
      ) === 0
    );
  });
  if (selected.length !== 12)
    throw new Error(
      'Expected six representative form components in two themes.',
    );
  session.openDocument(
    parameters.libraryPath,
    function (openError, libraryDocument) {
      if (openError) return done(openError);
      try {
        session.check();
        var masters = dom.find('SymbolMaster', libraryDocument);
        if (masters.length !== fixtures.length)
          throw new Error('Saved form Library Symbol count changed.');
        var report = {
          symbols: masters.length,
          nativeText: dom.find('Text', libraryDocument).length,
          nativePaths: dom.find('ShapePath', libraryDocument).length,
          bitmaps: dom.find('Image', libraryDocument).length,
          assets: Object.keys(manifestFile.assets || {}).length,
          assetBindings: 0,
          instances: [],
        };
        if (
          report.bitmaps ||
          report.nativeText < fixtures.length ||
          !report.nativePaths
        )
          throw new Error('Saved form Library lost editable vectors/text.');
        if (report.assets < 8)
          throw new Error('Saved form Color Variables missing.');
        Object.keys(manifestFile.assets).forEach(function (key) {
          var old = manifestFile.assets[key];
          if (
            !libraryDocument.swatches.some(function (item) {
              return (
                item.id === old.id &&
                item.name === old.name &&
                item.color === old.color
              );
            })
          )
            throw new Error('Saved form Color Variable changed: ' + key);
        });
        dom.find('ShapePath', libraryDocument).forEach(function (layer) {
          layer.style.fills
            .concat(layer.style.borders)
            .forEach(function (paint) {
              if (paint.swatch) report.assetBindings++;
            });
        });
        if (report.assetBindings < 100)
          throw new Error('Saved form asset bindings missing.');
        fixtures.forEach(function (fixture) {
          var old = manifest[fixture.id];
          var master = masters.filter(function (item) {
            return item.symbolId === old.symbolId;
          })[0];
          if (
            !master ||
            master.id !== old.layerId ||
            master.name !== fixture.name
          )
            throw new Error(
              'Saved form Symbol identity changed: ' + fixture.id,
            );
        });
        session.closeDocument(libraryDocument);
        var consumer = session.createDocument();
        consumer.selectedPage.name = 'Form Library Instances';
        var library = session.library(parameters.libraryPath);
        var refs = library.getImportableSymbolReferencesForDocument(consumer);
        if (refs.length !== fixtures.length)
          throw new Error('Form Library importable Symbol count changed.');
        selected.forEach(function (fixture, index) {
          session.check();
          var ref = refs.filter(function (item) {
            return item.name === fixture.name;
          })[0];
          if (!ref) throw new Error('Symbol not importable: ' + fixture.id);
          var master = ref.import();
          var instance = master.createNewInstance();
          instance.parent = consumer.selectedPage;
          instance.frame.x = (index % 3) * 550;
          instance.frame.y = Math.floor(index / 3) * 220;
          var override = instance.overrides.filter(function (item) {
            return item.property === 'stringValue';
          })[0];
          if (!override)
            throw new Error('Missing text override: ' + fixture.id);
          override.value =
            fixture.component === 'split-button'
              ? 'Done'
              : fixture.component === 'radio-group'
                ? 'Updated'
                : 'Updated ' + fixture.component;
          if (fixture.component !== 'split-button')
            instance.resizeWithSmartLayout();
          var fitWidth = instance.frame.width;
          dom.export(instance, {
            formats: 'png',
            scales: '2',
            output: parameters.exportsPath,
            filename: fixture.id + '-fit',
            overwriting: true,
          });
          instance.frame.width += 80;
          dom.export(instance, {
            formats: 'png',
            scales: '2',
            output: parameters.exportsPath,
            filename: fixture.id + '-wide',
            overwriting: true,
          });
          report.instances.push({
            id: fixture.id,
            linked: !!master.getLibrary(),
            override: override.value,
            naturalWidth: fixture.box.width,
            fitWidth: fitWidth,
            wideWidth: instance.frame.width,
            height: instance.frame.height,
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
                    var reopenedInstances = dom.find(
                      'SymbolInstance',
                      reopened,
                    );
                    if (
                      reopenedInstances.length !== selected.length ||
                      report.instances.some(function (item) {
                        return !item.linked;
                      })
                    )
                      throw new Error(
                        'Form consumer Library links did not survive.',
                      );
                    report.reopened = reopenedInstances.map(
                      function (instance) {
                        return {
                          name: instance.name,
                          overrides: instance.overrides
                            .filter(function (item) {
                              return item.property === 'stringValue';
                            })
                            .map(function (item) {
                              return item.value;
                            }),
                        };
                      },
                    );
                    if (
                      report.reopened.some(function (item) {
                        return !item.overrides.some(function (value) {
                          return (
                            value === 'Done' ||
                            value === 'Updated' ||
                            String(value).indexOf('Updated ') === 0
                          );
                        });
                      })
                    )
                      throw new Error(
                        'Form consumer text override did not survive.',
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
