// Sync gate step 2: the next Library version, with the first Text of each
// selected master edited natively.
module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  session.openDocument(parameters.libraryPath, function (error, document) {
    if (error) return done(error);
    try {
      var edits = [];
      dom.find('SymbolMaster', document).forEach(function (master) {
        if (parameters.names.indexOf(master.name) < 0) return;
        var text = dom.find('Text', master)[0];
        text.text = parameters.edit;
        edits.push(master.name);
      });
      if (edits.length !== parameters.names.length)
        throw new Error('Sync gate could not edit every selected master.');
      session.saveDocument(
        document,
        parameters.libraryPath,
        function (saveError) {
          done(saveError, edits);
        },
        { inPlace: true },
      );
    } catch (failure) {
      done(failure);
    }
  });
};
