// Exercise the Sketch 2026.4 Variant Set API on a disposable Library copy.
module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var names = parameters.variants.map(function (entry) {
    return entry.name;
  });
  function snapshot(document) {
    function descendants(layer) {
      return [layer.id].concat(
        (layer.layers || []).reduce(function (all, child) {
          return all.concat(descendants(child));
        }, []),
      );
    }
    return dom
      .find('SymbolMaster', document)
      .map(function (master) {
        return {
          name: master.name,
          symbolId: master.symbolId,
          layerId: master.id,
          descendants: descendants(master),
        };
      })
      .sort(function (a, b) {
        return a.symbolId < b.symbolId ? -1 : a.symbolId > b.symbolId ? 1 : 0;
      });
  }
  session.openDocument(parameters.libraryPath, function (error, library) {
    if (error) return done(error);
    try {
      var before = snapshot(library);
      var swatchesBefore = library.swatches
        .map(function (item) {
          return item.id;
        })
        .sort();
      var page = library.pages.filter(function (item) {
        return item.name === 'Form Controls';
      })[0];
      if (!page) throw new Error('Form Controls page missing');
      var masters = names.map(function (name) {
        return dom.find('SymbolMaster', page).filter(function (item) {
          return item.name === name;
        })[0];
      });
      new dom.Group.VariantSet({
        name: 'Text Field / Form',
        parent: page,
        variantProperties: [
          { name: 'State', values: ['Default', 'Error'] },
          { name: 'Theme', values: ['Light', 'Dark'] },
        ],
        layers: masters,
      });
      parameters.variants.forEach(function (entry, index) {
        masters[index].variantConfiguration = {
          State: entry.state,
          Theme: entry.theme,
        };
      });
      dom.export(page, {
        formats: 'png',
        scales: '0.5',
        output: parameters.previewPath,
        filename: 'variant-prototype',
        overwriting: true,
      });
      var configured = parameters.variants.map(function (entry, index) {
        return {
          name: masters[index].name,
          variant: !!masters[index].isVariant,
          configuration: masters[index].variantConfiguration,
          parentId: masters[index].getParentVariantSet().id,
        };
      });
      session.saveDocument(
        library,
        parameters.libraryPath,
        function (saveError) {
          if (saveError) return done(saveError);
          try {
            session.closeDocument(library);
            session.openDocument(
              parameters.libraryPath,
              function (reopenError, reopened) {
                if (reopenError) return done(reopenError);
                try {
                  var reopenedSet = reopened
                    .getVariantSets()
                    .filter(function (item) {
                      return item.name === 'Text Field / Form';
                    })[0];
                  if (!reopenedSet)
                    throw new Error('Variant Set missing after reopen');
                  done(null, {
                    before: before,
                    after: snapshot(reopened),
                    swatchesBefore: swatchesBefore,
                    swatchesAfter: reopened.swatches
                      .map(function (item) {
                        return item.id;
                      })
                      .sort(),
                    configured: configured,
                    setId: reopenedSet.id,
                    properties: reopenedSet.variantProperties.map(
                      function (item) {
                        return { name: item.name, values: item.values };
                      },
                    ),
                    selection: parameters.variants.map(function (entry) {
                      return {
                        state: entry.state,
                        theme: entry.theme,
                        name: reopenedSet.getBestVariantMasterForConfiguration({
                          State: entry.state,
                          Theme: entry.theme,
                        }).name,
                      };
                    }),
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
        { inPlace: true },
      );
    } catch (failure) {
      done(failure);
    }
  });
};
