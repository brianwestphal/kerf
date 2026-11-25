// Update a consumer's foreign Variant Set from a disposable next Library version.
module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var library = session.library(parameters.libraryPath).sketchObject;
  var controller = NSClassFromString('AppController')
    .sharedInstance()
    .librariesController();
  function inspect(document) {
    return dom.find('SymbolInstance', document).map(function (instance) {
      var master = document.getSymbols().filter(function (item) {
        return item.symbolId === instance.symbolId;
      })[0];
      return {
        name: master.name,
        firstText: dom.find('Text', master)[0].text,
        width: instance.frame.width,
        overrides: instance.overrides
          .filter(function (item) {
            return item.property === 'stringValue' && !item.isDefault;
          })
          .map(function (item) {
            return item.value;
          }),
      };
    });
  }
  function inspectSources(document) {
    return dom.find('SymbolMaster', document).map(function (master) {
      var set = master.getParentVariantSet();
      var text = dom.find('Text', master)[0];
      return {
        name: master.name,
        id: master.symbolId,
        firstText: text ? text.text : null,
        variantSet: set ? set.name : null,
      };
    });
  }
  session.openDocument(parameters.consumerPath, function (error, consumer) {
    if (error) return done(error);
    try {
      var foreignSets = consumer._getMSDocumentData().foreignVariantSets();
      if (foreignSets.count() !== 1)
        throw new Error('Expected one imported foreign Variant Set');
      var foreign = foreignSets.objectAtIndex(0);
      var before = inspect(consumer);
      var sourcesBefore = inspectSources(consumer);
      var outOfDateBefore = !!foreign.isOutOfDateWithLibrary(library);
      var source = foreign.masterFromLibrary(library);
      if (!source) throw new Error('Updated Variant Set not found in Library');
      controller.syncForeignObject_withMaster_fromLibrary(
        foreign,
        source,
        library,
      );
      var outOfDateAfter = !!foreign.isOutOfDateWithLibrary(library);
      var after = inspect(consumer);
      var sourcesAfter = inspectSources(consumer);
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
                  outOfDateBefore: outOfDateBefore,
                  outOfDateAfter: outOfDateAfter,
                  before: before,
                  after: after,
                  reopened: inspect(reopened),
                  sourcesBefore: sourcesBefore,
                  sourcesAfter: sourcesAfter,
                  sourcesReopened: inspectSources(reopened),
                  foreignSetCountAfter: reopened
                    ._getMSDocumentData()
                    .foreignVariantSets()
                    .count(),
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
