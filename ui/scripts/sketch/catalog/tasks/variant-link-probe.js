// Inspect a disposable Variant Set import before attempting library sync.
module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  try {
    var consumer = session.createDocument();
    var library = session.library(parameters.libraryPath);
    var symbolRefs = library.getImportableSymbolReferencesForDocument(consumer);
    var setRefs =
      library.getImportableVariantSetReferencesForDocument(consumer);
    var setRef = setRefs.filter(function (ref) {
      return ref.name === 'Text Field / Form';
    })[0];
    if (!setRef) throw new Error('Variant Set reference missing');
    var sourceIds = parameters.variants.map(function (item) {
      return item.symbolId;
    });
    var relatedRefs = symbolRefs.filter(function (ref) {
      return sourceIds.indexOf(ref.id) >= 0;
    });
    var direct = null;
    if (relatedRefs.length) {
      var directConsumer = session.createDocument();
      var directRef = library
        .getImportableSymbolReferencesForDocument(directConsumer)
        .filter(function (ref) {
          return ref.id === relatedRefs[0].id;
        })[0];
      var directMaster = directRef.import();
      direct = {
        referenceId: directRef.id,
        importedId: directMaster.symbolId,
        foreign: !!directMaster.sketchObject.foreignObject(),
        library: !!directMaster.getLibrary(),
        variant: !!directMaster.isVariant,
      };
      session.closeDocument(directConsumer);
    }
    var set = setRef.import();
    var setNative = set.sketchObject;
    var parentBefore = set.parent ? set.parent.name : null;
    var setsBefore = consumer.getVariantSets().length;
    if (parameters.attachSet) set.parent = consumer.selectedPage;
    var entries = parameters.variants.map(function (variant, index) {
      var master = set.getBestVariantMasterForConfiguration({
        State: variant.state,
        Theme: variant.theme,
      });
      var instance = master.createNewInstance();
      instance.parent = consumer.selectedPage;
      instance.frame.y = index * 180;
      var override = instance.overrides.filter(function (item) {
        return item.property === 'stringValue';
      })[0];
      if (!override) throw new Error('Text override missing: ' + variant.name);
      override.value = 'Linked probe override ' + index;
      instance.frame.width += 80;
      return {
        name: master.name,
        sourceId: variant.symbolId,
        importedId: master.symbolId,
        foreign: !!master.sketchObject.foreignObject(),
        library: !!master.getLibrary(),
        width: instance.frame.width,
        override: override.value,
      };
    });
    var before = {
      setReference: {
        id: setRef.id,
        name: setRef.name,
        type: setRef.objectType,
        library: !!setRef.library,
        nativeSourceLibrary: !!setRef.sketchObject.sourceLibrary(),
      },
      set: {
        id: set.id,
        parentBefore: parentBefore,
        parentAfter: set.parent ? set.parent.name : null,
        setsBefore: setsBefore,
        setsAfter: consumer.getVariantSets().length,
        nativeClass: String(setNative.class()),
        foreignMethod: typeof setNative.foreignObject === 'function',
        foreign:
          typeof setNative.foreignObject === 'function' &&
          !!setNative.foreignObject(),
      },
      symbolReferenceCount: symbolRefs.length,
      relatedSymbolReferences: relatedRefs.map(function (ref) {
        return {
          id: ref.id,
          name: ref.name,
          type: ref.objectType,
          library: !!ref.library,
        };
      }),
      directSymbolImport: direct,
      entries: entries,
    };
    session.saveDocument(consumer, parameters.consumerPath, function (error) {
      if (error) return done(error);
      session.closeDocument(consumer);
      session.openDocument(
        parameters.consumerPath,
        function (openError, reopened) {
          if (openError) return done(openError);
          try {
            done(null, {
              before: before,
              reopened: {
                foreignVariantSetCount: reopened
                  ._getMSDocumentData()
                  .foreignVariantSets()
                  .count(),
                sets: reopened.getVariantSets().map(function (item) {
                  return { id: item.id, name: item.name };
                }),
                masters: reopened
                  .getSymbols()
                  .filter(function (item) {
                    return entries.some(function (entry) {
                      return item.symbolId === entry.importedId;
                    });
                  })
                  .map(function (item) {
                    return {
                      id: item.symbolId,
                      name: item.name,
                      foreign: !!item.sketchObject.foreignObject(),
                      library: !!item.getLibrary(),
                    };
                  }),
                instances: dom
                  .find('SymbolInstance', reopened)
                  .map(function (item) {
                    return {
                      id: item.symbolId,
                      width: item.frame.width,
                      overrides: item.overrides
                        .filter(function (override) {
                          return (
                            override.property === 'stringValue' &&
                            !override.isDefault
                          );
                        })
                        .map(function (override) {
                          return override.value;
                        }),
                    };
                  }),
              },
            });
          } catch (failure) {
            done(failure);
          }
        },
      );
    });
  } catch (error) {
    done(error);
  }
};
