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
  var fixtures = readJSON(parameters.variantFixturesPath);
  var manifestData = readJSON(parameters.variantManifestPath);
  var manifest = manifestData.variants;
  var assets = manifestData.assets;
  session.openDocument(
    parameters.libraryPath,
    function (openError, libraryDocument) {
      if (openError) return done(openError);
      try {
        var masters = dom.find('SymbolMaster', libraryDocument);
        var reports = [];
        if (!assets) throw new Error('Missing variant semantic assets');
        ['swatches', 'layerStyles', 'textStyles'].forEach(function (kind) {
          var collection =
            kind === 'swatches'
              ? libraryDocument.swatches
              : kind === 'layerStyles'
                ? libraryDocument.sharedLayerStyles
                : libraryDocument.sharedTextStyles;
          Object.keys(assets[kind]).forEach(function (key) {
            var expected = assets[kind][key];
            var found = collection.filter(function (item) {
              return item.id === expected.id;
            })[0];
            if (
              !found ||
              found.name !== expected.name ||
              (kind === 'swatches' && found.color !== expected.color)
            )
              throw new Error('Variant semantic asset differs: ' + key);
          });
        });
        fixtures.forEach(function (fixture) {
          var master = masters.filter(function (item) {
            return item.symbolId === manifest[fixture.id].symbolId;
          })[0];
          if (!master || master.name !== fixture.name)
            throw new Error('Variant master missing: ' + fixture.id);
          var id = fixture.id;
          if (
            !master.sharedStyle ||
            master.sharedStyle.id !== assets.layerStyles[id + '.Surface'].id ||
            !master.style.fills[0].swatch ||
            master.style.fills[0].swatch.id !==
              assets.swatches[id + '.Fill'].id ||
            master.style.fills[0].color !== fixture.layout.fill
          )
            throw new Error('Variant surface asset binding differs: ' + id);
          if (
            master.style.borders.length &&
            (!master.style.borders[0].swatch ||
              master.style.borders[0].swatch.id !==
                assets.swatches[id + '.Border'].id)
          )
            throw new Error('Variant border asset binding differs: ' + id);
          if (dom.find('Image', master).length)
            throw new Error('Bitmap variant: ' + fixture.id);
          var label = master.layers.filter(function (layer) {
            return layer.name === 'Label';
          })[0];
          if (!!label !== (fixture.layout.label !== null))
            throw new Error('Label presence differs: ' + fixture.id);
          if (
            label &&
            (label.text !== fixture.layout.label ||
              label.style.fontSize !== fixture.layout.fontSize)
          )
            throw new Error('Variant typography differs: ' + fixture.id);
          if (
            label &&
            (!label.sharedStyle ||
              label.sharedStyle.id !== assets.textStyles[id + '.Label'].id ||
              !label.style.textSwatch ||
              label.style.textSwatch.id !== assets.swatches[id + '.Text'].id ||
              label.style.textColor !== fixture.layout.textColor)
          )
            throw new Error('Variant label asset binding differs: ' + id);
          dom
            .find('ShapePath', master)
            .filter(function (path) {
              return path.name.indexOf('Icon Path / ') === 0;
            })
            .forEach(function (path) {
              path.style.borders
                .concat(path.style.fills)
                .forEach(function (paint) {
                  if (
                    !paint.swatch ||
                    paint.swatch.id !== assets.swatches[id + '.Text'].id
                  )
                    throw new Error(
                      'Variant icon asset binding differs: ' + id,
                    );
                });
            });
          if (Math.abs(master.frame.height - fixture.layout.height) > 0.01)
            throw new Error('Variant height differs: ' + fixture.id);
          for (var name in {
            'Badge Background': 1,
            'Badge Count': 1,
            Spinner: 1,
            'Focus Ring': 1,
          }) {
            var layer = master.layers.filter(function (item) {
              return item.name === name;
            })[0];
            if (layer && !layer.ignoresStackLayout)
              throw new Error(
                'State layer entered content Stack: ' + fixture.id + '/' + name,
              );
          }
          if (
            fixture.layout.badge &&
            !master.layers.some(function (item) {
              return item.name === 'Badge Background';
            })
          )
            throw new Error('Badge missing: ' + fixture.id);
          if (fixture.layout.badge) {
            var badgeBackground = master.layers.filter(function (item) {
              return item.name === 'Badge Background';
            })[0];
            dom.find('ShapePath', badgeBackground).forEach(function (path) {
              if (
                !path.sharedStyle ||
                path.sharedStyle.id !==
                  assets.layerStyles[id + '.Badge Background'].id ||
                !path.style.fills[0].swatch ||
                path.style.fills[0].swatch.id !==
                  assets.swatches[id + '.Badge Fill'].id
              )
                throw new Error(
                  'Badge background asset binding differs: ' + id,
                );
            });
            if (!fixture.layout.badge.dot) {
              var badgeCount = master.layers.filter(function (item) {
                return item.name === 'Badge Count';
              })[0];
              if (
                !badgeCount ||
                !badgeCount.sharedStyle ||
                badgeCount.sharedStyle.id !==
                  assets.textStyles[id + '.Badge Count'].id ||
                !badgeCount.style.textSwatch ||
                badgeCount.style.textSwatch.id !==
                  assets.swatches[id + '.Badge Text'].id
              )
                throw new Error('Badge count asset binding differs: ' + id);
            }
          }
          if (
            fixture.layout.spinner &&
            !master.layers.some(function (item) {
              return (
                item.name === 'Spinner Host' &&
                item.layers.some(function (child) {
                  return child.name === 'Spinner';
                })
              );
            })
          )
            throw new Error('Spinner missing: ' + fixture.id);
          if (fixture.layout.spinner) {
            var spinner = master.layers
              .filter(function (item) {
                return item.name === 'Spinner Host';
              })[0]
              .layers.filter(function (item) {
                return item.name === 'Spinner';
              })[0];
            dom.find('ShapePath', spinner).forEach(function (path) {
              path.style.borders
                .concat(path.style.fills)
                .forEach(function (paint) {
                  if (
                    !paint.swatch ||
                    paint.swatch.id !== assets.swatches[id + '.Text'].id
                  )
                    throw new Error('Spinner asset binding differs: ' + id);
                });
            });
          }
          if (
            fixture.focus &&
            (fixture.props.focusRingInset
              ? master.style.innerShadows.length !== 2
              : master.style.shadows.length !== 2)
          )
            throw new Error('Focus ring style missing: ' + fixture.id);
          if (fixture.focus) {
            var shadows = fixture.props.focusRingInset
              ? master.style.innerShadows
              : master.style.shadows;
            var outlineIndex = fixture.props.focusRingInset ? 1 : 0;
            var contrastIndex = 1 - outlineIndex;
            if (
              !shadows[outlineIndex].swatch ||
              shadows[outlineIndex].swatch.id !==
                assets.swatches[id + '.Focus Outline'].id ||
              !shadows[contrastIndex].swatch ||
              shadows[contrastIndex].swatch.id !==
                assets.swatches[id + '.Focus Contrast'].id
            )
              throw new Error('Focus shadow asset binding differs: ' + id);
          }
          if (
            fixture.props.pressed &&
            fixture.layout.shadowColor &&
            (!master.style.innerShadows[0].swatch ||
              master.style.innerShadows[0].swatch.id !==
                assets.swatches[id + '.Pressed Shadow'].id)
          )
            throw new Error('Pressed shadow asset binding differs: ' + id);
          reports.push({
            id: fixture.id,
            symbolId: master.symbolId,
            editableLabel: !!label,
            layers: master.layers.map(function (item) {
              return item.name;
            }),
          });
        });
        session.closeDocument(libraryDocument);
        var consumer = session.createDocument();
        consumer.selectedPage.name = 'Variant Library Instances';
        var refs = session
          .library(parameters.libraryPath)
          .getImportableSymbolReferencesForDocument(consumer);
        var cases = [];
        fixtures.forEach(function (fixture, index) {
          session.check();
          var ref = refs.filter(function (item) {
            return item.name === fixture.name;
          })[0];
          if (!ref) throw new Error('Variant is not importable: ' + fixture.id);
          var imported = ref.import();
          for (var step = 0; step < 3; step++) {
            var instance = imported.createNewInstance();
            instance.parent = consumer.selectedPage;
            instance.name = fixture.id + ' / ' + step;
            var text = instance.overrides.filter(function (item) {
              return (
                item.property === 'stringValue' &&
                item.value === fixture.layout.label
              );
            })[0];
            if (fixture.layout.label !== null && !text)
              throw new Error('No label override: ' + fixture.id);
            if (text && step === 1) {
              text.value = 'A longer editable label';
              instance.resizeWithSmartLayout();
            }
            if (step === 2) {
              instance.horizontalSizing = dom.FlexSizing.Fixed;
              instance.frame.width = Math.max(180, fixture.layout.width + 80);
            }
            instance.frame.x = step * 300;
            instance.frame.y = index * 110;
            var expanded = instance.expandedLayers.map(function (layer) {
              return {
                name: layer.name,
                frame: layer.frame.toJSON(),
                children: layer.layers
                  ? layer.layers.map(function (child) {
                      return { name: child.name, frame: child.frame.toJSON() };
                    })
                  : [],
              };
            });
            var badge = expanded.filter(function (layer) {
              return layer.name === 'Badge Background';
            })[0];
            if (
              badge &&
              Math.abs(
                instance.frame.width -
                  badge.frame.x -
                  (fixture.layout.width - fixture.layout.badge.x),
              ) > 1
            )
              throw new Error('Badge lost trailing anchor: ' + fixture.id);
            if (
              badge &&
              Math.abs(badge.frame.width - fixture.layout.badge.width) > 0.1
            )
              throw new Error('Badge changed size: ' + fixture.id);
            var host = expanded.filter(function (layer) {
              return layer.name === 'Spinner Host';
            })[0];
            if (host) {
              var spinning = host.children.filter(function (layer) {
                return layer.name === 'Spinner';
              })[0];
              if (
                !spinning ||
                Math.abs(spinning.frame.width - fixture.layout.spinner.width) >
                  0.1 ||
                Math.abs(
                  host.frame.x +
                    spinning.frame.x +
                    spinning.frame.width / 2 -
                    instance.frame.width / 2,
                ) > 1
              )
                throw new Error(
                  'Spinner lost centered fixed size: ' + fixture.id,
                );
            }
            cases.push({
              id: fixture.id,
              step: step,
              instanceId: instance.id,
              symbolId: instance.symbolId,
              linked: !!imported.getLibrary(),
              frame: instance.frame.toJSON(),
              override: text ? text.value : null,
              expanded: expanded,
            });
            dom.export(instance, {
              formats: 'png',
              scales: '2',
              output: parameters.variantConsumerExportsPath,
              filename: fixture.id + '-' + step,
              overwriting: true,
            });
          }
        });
        session.saveDocument(
          consumer,
          parameters.variantConsumerPath,
          function (saveError) {
            if (saveError) return done(saveError);
            try {
              session.closeDocument(consumer);
              session.openDocument(
                parameters.variantConsumerPath,
                function (reopenError, reopened) {
                  if (reopenError) return done(reopenError);
                  try {
                    var instances = dom.find('SymbolInstance', reopened);
                    if (instances.length !== cases.length)
                      throw new Error(
                        'Variant consumer round trip lost instances.',
                      );
                    cases.forEach(function (test) {
                      var instance = instances.filter(function (item) {
                        return item.id === test.instanceId;
                      })[0];
                      if (!instance || instance.symbolId !== test.symbolId)
                        throw new Error(
                          'Variant consumer link changed: ' + test.id,
                        );
                      var text = instance.overrides.filter(function (item) {
                        return (
                          item.property === 'stringValue' &&
                          item.value === test.override
                        );
                      })[0];
                      if ((text ? text.value : null) !== test.override)
                        throw new Error('Variant override changed: ' + test.id);
                    });
                    done(null, {
                      symbols: reports,
                      cases: cases,
                      reopenedInstances: instances.length,
                      assets: {
                        swatches: Object.keys(assets.swatches).length,
                        layerStyles: Object.keys(assets.layerStyles).length,
                        textStyles: Object.keys(assets.textStyles).length,
                      },
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
    },
  );
};
