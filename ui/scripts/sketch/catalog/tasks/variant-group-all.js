// Group the unified Library's existing masters without rebuilding their IDs.
module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  function descendants(layer) {
    return [layer.id].concat(
      (layer.layers || []).reduce(function (all, child) {
        return all.concat(descendants(child));
      }, []),
    );
  }
  function snapshot(document) {
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
      if (parameters.previewPath)
        library.pages.forEach(function (page) {
          dom.export(page, {
            formats: 'png',
            scales: '0.5',
            output: parameters.previewPath,
            filename: 'before-' + page.name.replace(/\W+/g, '-').toLowerCase(),
            overwriting: true,
          });
        });
      var before = snapshot(library);
      var swatchesBefore = library.swatches.map(function (item) {
        return item.id;
      });
      var grouped = parameters.groups.map(function (group) {
        session.check();
        var page = library.pages.filter(function (item) {
          return item.name === group.page;
        })[0];
        if (!page) throw new Error('Page missing: ' + group.page);
        var masters = group.variants.map(function (variant) {
          var master = dom.find('SymbolMaster', page).filter(function (item) {
            return item.name === variant.name;
          })[0];
          if (!master) throw new Error('Master missing: ' + variant.name);
          return master;
        });
        var set = new dom.Group.VariantSet({
          name: group.name,
          parent: page,
          variantProperties: [
            {
              name: 'State',
              values: group.states,
            },
            { name: 'Theme', values: ['Light', 'Dark'] },
          ],
          layers: masters,
        });
        if (group.id) set.sketchObject.setObjectID(group.id);
        group.variants.forEach(function (variant, index) {
          masters[index].variantConfiguration = {
            State: variant.state,
            Theme: variant.theme,
          };
        });
        return {
          page: group.page,
          name: group.name,
          id: set.id,
          members: masters.map(function (master) {
            return { name: master.name, symbolId: master.symbolId };
          }),
        };
      });
      session.saveDocument(
        library,
        parameters.libraryPath,
        function (saveError) {
          if (saveError) return done(saveError);
          session.closeDocument(library);
          session.openDocument(
            parameters.libraryPath,
            function (reopenError, reopened) {
              if (reopenError) return done(reopenError);
              try {
                if (parameters.previewPath)
                  reopened.pages.forEach(function (page) {
                    dom.export(page, {
                      formats: 'png',
                      scales: '0.5',
                      output: parameters.previewPath,
                      filename:
                        'after-' + page.name.replace(/\W+/g, '-').toLowerCase(),
                      overwriting: true,
                    });
                  });
                done(null, {
                  before: before,
                  after: snapshot(reopened),
                  swatchesBefore: swatchesBefore,
                  swatchesAfter: reopened.swatches.map(function (item) {
                    return item.id;
                  }),
                  grouped: grouped,
                  setCount: reopened.getVariantSets().length,
                });
              } catch (failure) {
                done(failure);
              }
            },
          );
        },
        { inPlace: true },
      );
    } catch (failure) {
      done(failure);
    }
  });
};
