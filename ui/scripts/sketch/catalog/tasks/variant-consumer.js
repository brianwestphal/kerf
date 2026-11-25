// Check the native Variant Set browser and a linked consumer of its masters.
module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  try {
    var consumer = session.createDocument();
    var library = session.library(parameters.libraryPath);
    var sets = library.getImportableVariantSetReferencesForDocument(consumer);
    var setRef = sets.filter(function (item) {
      return (
        item.name === 'Text Field / Form' ||
        item.name.slice(-17) === 'Text Field / Form'
      );
    })[0];
    if (!setRef) throw new Error('Native Variant Set not importable');
    var set = setRef.import();
    var setName = set.name;
    var refs = library.getImportableSymbolReferencesForDocument(consumer);
    var entries = parameters.variants.map(function (variant, index) {
      var name = variant.name;
      var ref = refs.filter(function (item) {
        return (
          item.name === name || item.name.slice(-name.length - 1) === '/' + name
        );
      })[0];
      var master = ref
        ? ref.import()
        : set.getBestVariantMasterForConfiguration({
            State: variant.state,
            Theme: variant.theme,
          });
      if (!master || master.name !== name)
        throw new Error(
          'Variant master not resolved: ' +
            JSON.stringify({
              expectedName: name,
              importPath: ref ? 'Symbol reference' : 'Variant Set',
              actualName: master && master.name,
              actualId: master && master.symbolId,
              referenceNames: refs
                .filter(function (item) {
                  return (
                    item.name.indexOf('Text Field') >= 0 ||
                    item.name.indexOf('Default/') >= 0
                  );
                })
                .map(function (item) {
                  return item.name;
                })
                .slice(0, 12),
            }),
        );
      var instance = master.createNewInstance();
      instance.parent = consumer.selectedPage;
      instance.frame.y = index * 180;
      var override = instance.overrides.filter(function (item) {
        return item.property === 'stringValue';
      })[0];
      if (!override) throw new Error('Text override missing: ' + name);
      override.value = 'Prototype override ' + index;
      instance.frame.width += 80;
      return {
        name: name,
        sourceSymbolId: variant.symbolId,
        importedSymbolId: master.symbolId,
        importPath: ref ? 'Symbol reference' : 'Variant Set',
        symbolId: instance.symbolId,
        linked: !!master.getLibrary(),
        foreign: !!master.sketchObject.foreignObject(),
        setLinked: typeof set.getLibrary === 'function' && !!set.getLibrary(),
        width: instance.frame.width,
        override: override.value,
      };
    });
    session.saveDocument(
      consumer,
      parameters.consumerPath,
      function (saveError) {
        if (saveError) return done(saveError);
        session.closeDocument(consumer);
        session.openDocument(
          parameters.consumerPath,
          function (openError, reopened) {
            if (openError) return done(openError);
            try {
              done(null, {
                setName: setName,
                setCount: sets.length,
                symbolReferenceCount: refs.length,
                entries: entries,
                reopened: dom
                  .find('SymbolInstance', reopened)
                  .map(function (instance) {
                    var override = instance.overrides.filter(function (item) {
                      return item.property === 'stringValue' && !item.isDefault;
                    })[0];
                    return {
                      symbolId: instance.symbolId,
                      width: instance.frame.width,
                      override: override ? override.value : null,
                    };
                  }),
              });
            } catch (failure) {
              done(failure);
            }
          },
        );
      },
    );
  } catch (error) {
    done(error);
  }
};
