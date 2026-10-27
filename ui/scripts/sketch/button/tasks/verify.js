function readJSON(path) {
  var text = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!text) throw new Error('Cannot read ' + path);
  return JSON.parse(String(text));
}

module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  session.openDocument(
    parameters.libraryPath,
    function (openError, libraryDocument) {
      if (openError) return done(openError);
      try {
        session.check();
        var masters = dom.find('SymbolMaster', libraryDocument);
        var fixtures = readJSON(parameters.fixturesPath);
        var variantFixtures = readJSON(parameters.variantFixturesPath);
        if (masters.length !== fixtures.length + variantFixtures.length)
          throw new Error('Saved Symbol count differs from captured variants.');
        var report = {
          reopenedSymbols: masters.length,
          editableText: dom.find('Text', libraryDocument).length,
          bitmaps: dom.find('Image', libraryDocument).length,
        };
        if (report.editableText < fixtures.length || report.bitmaps !== 0)
          throw new Error(
            'Saved library lost editable text or gained bitmaps.',
          );
        var assetManifest = readJSON(parameters.identitiesPath).assets;
        if (!assetManifest)
          throw new Error('Missing Button shared asset manifest.');
        report.assets = {
          swatches: 0,
          layerStyles: 0,
          textStyles: 0,
          bindings: [],
        };
        Object.keys(assetManifest.swatches).forEach(function (key) {
          var expected = assetManifest.swatches[key];
          var found = libraryDocument.swatches.filter(function (item) {
            return item.id === expected.id;
          })[0];
          if (
            !found ||
            found.name !== expected.name ||
            found.color !== expected.color
          )
            throw new Error('Saved Color Variable differs: ' + key);
          report.assets.swatches++;
        });
        ['layerStyles', 'textStyles'].forEach(function (kind) {
          var collection =
            kind === 'layerStyles'
              ? libraryDocument.sharedLayerStyles
              : libraryDocument.sharedTextStyles;
          Object.keys(assetManifest[kind]).forEach(function (key) {
            var expected = assetManifest[kind][key];
            var found = collection.filter(function (item) {
              return item.id === expected.id;
            })[0];
            if (!found || found.name !== expected.name)
              throw new Error('Saved shared style differs: ' + key);
            report.assets[kind]++;
          });
        });
        masters
          .filter(function (master) {
            return fixtures.some(function (fixture) {
              return fixture.name === master.name;
            });
          })
          .forEach(function (master) {
            var fixture = fixtures.filter(function (item) {
              return item.name === master.name;
            })[0];
            if (!fixture)
              throw new Error('Missing source fixture: ' + master.name);
            var label = dom.find('Text', master)[0];
            var theme = master.name.indexOf('/ Dark') >= 0 ? 'dark' : 'light';
            var secondary = master.name.indexOf('Secondary') >= 0;
            var family =
              theme + '.' + (secondary ? 'neutral-secondary' : 'brand-primary');
            var textKey =
              theme + '.' + (secondary ? 'neutral.on-quiet' : 'brand.on-loud');
            var expectedText = assetManifest.swatches[textKey];
            if (
              !master.sharedStyle ||
              master.sharedStyle.id !== assetManifest.layerStyles[family].id ||
              !label.sharedStyle ||
              label.sharedStyle.id !== assetManifest.textStyles[family].id ||
              !label.style.textSwatch ||
              label.style.textSwatch.id !== expectedText.id ||
              label.style.textColor !== expectedText.color
            )
              throw new Error('Saved shared binding differs: ' + master.name);
            if (
              label.style.fontFamily !== 'system' ||
              label.style.fontSize !== 16 ||
              label.style.fontWeight !== 6 ||
              label.style.opacity !== 1 ||
              label.style.lineHeight ||
              label.style.alignment !== dom.Text.Alignment.center ||
              label.style.verticalAlignment !==
                dom.Text.VerticalAlignment.center
            )
              throw new Error('Saved typography differs: ' + master.name);
            var stack = master.stackLayout.toJSON();
            if (
              master.style.opacity !== 1 ||
              master.style.corners.toJSON().radii[0] !==
                fixture.layout.radius ||
              stack.gap !== fixture.layout.gap ||
              stack.padding.left !== fixture.layout.padding.left ||
              stack.padding.right !== fixture.layout.padding.right ||
              master.frame.height !== fixture.layout.height
            )
              throw new Error(
                'Saved border, corner, or spacing differs: ' + master.name,
              );
            if (!secondary) {
              var expectedFill =
                assetManifest.swatches[theme + '.brand.fill-loud'];
              if (
                !master.style.fills[0].swatch ||
                master.style.fills[0].swatch.id !== expectedFill.id ||
                master.style.fills[0].color !== expectedFill.color ||
                master.style.borders.length !== 0
              )
                throw new Error('Saved fill binding differs: ' + master.name);
            } else {
              var expectedBorder =
                assetManifest.swatches[theme + '.neutral.border-loud'];
              if (
                !master.style.borders[0].swatch ||
                master.style.borders[0].swatch.id !== expectedBorder.id ||
                master.style.borders[0].color !== expectedBorder.color ||
                master.style.borders[0].thickness !==
                  fixture.layout.borderWidth ||
                master.style.fills[0].color !== fixture.layout.fill
              )
                throw new Error('Saved border binding differs: ' + master.name);
            }
            dom.find('ShapePath', master).forEach(function (path) {
              path.style.borders.forEach(function (border) {
                if (!border.swatch || border.swatch.id !== expectedText.id)
                  throw new Error(
                    'Saved icon border binding differs: ' + master.name,
                  );
              });
            });
            report.assets.bindings.push({
              name: master.name,
              layerStyle: master.sharedStyle.id,
              textStyle: label.sharedStyle.id,
              textSwatch: label.style.textSwatch.id,
            });
          });
        session.closeDocument(libraryDocument);
        var consumer = session.createDocument();
        consumer.selectedPage.name = 'Library Instances';
        var library = session.library(parameters.libraryPath);
        var refs = library.getImportableSymbolReferencesForDocument(consumer);
        refs = refs.filter(function (ref) {
          return fixtures.some(function (fixture) {
            return fixture.name === ref.name;
          });
        });
        if (refs.length !== 6)
          throw new Error('Expected six pilot importable Symbols.');
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
