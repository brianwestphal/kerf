// Sync gate step 3: open the consumer against the updated Library, sync each
// out-of-date foreign Symbol through the native libraries controller, and
// check the edit arrived, the override survived, and save/reopen holds. The
// JS syncWithLibrary() and a master taken from the JS document wrapper are
// silent no-ops here; masterFromLibrary: supplies the master Sketch expects.
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
  session.openDocument(parameters.consumerPath, function (error, consumer) {
    if (error) return done(error);
    try {
      var synced = consumer.getSymbols().map(function (master) {
        var foreign = master.sketchObject.foreignObject();
        var before = !!foreign.isOutOfDateWithLibrary(library);
        controller.syncForeignObject_withMaster_fromLibrary(
          foreign,
          foreign.masterFromLibrary(library),
          library,
        );
        return {
          name: master.name,
          outOfDateBefore: before,
          outOfDateAfter: !!foreign.isOutOfDateWithLibrary(library),
        };
      });
      var after = inspect(consumer);
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
                  done(null, {
                    synced: synced,
                    after: after,
                    reopened: inspect(reopened),
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
