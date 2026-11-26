// Edit selected source masters in a disposable next Library version by stable Symbol ID.
module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  session.openDocument(parameters.libraryPath, function (error, library) {
    if (error) return done(error);
    try {
      var edited = [];
      dom.find('SymbolMaster', library).forEach(function (master) {
        if (parameters.symbolIds.indexOf(master.symbolId) < 0) return;
        var text = dom.find('Text', master)[0];
        if (!text)
          throw new Error('Selected master has no Text: ' + master.name);
        text.text = parameters.edit;
        edited.push(master.symbolId);
      });
      if (edited.length !== parameters.symbolIds.length)
        throw new Error('Not every selected Symbol ID was edited');
      session.saveDocument(
        library,
        parameters.libraryPath,
        function (saveError) {
          done(saveError, edited);
        },
        { inPlace: true },
      );
    } catch (failure) {
      done(failure);
    }
  });
};
