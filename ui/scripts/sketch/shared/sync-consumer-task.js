// Sync gate step 1: a consumer document linked to the current Library, with a
// Text override on each instance.
module.exports.run = function (session, parameters, done) {
  try {
    var consumer = session.createDocument();
    var library = session.library(parameters.libraryPath);
    var refs = library.getImportableSymbolReferencesForDocument(consumer);
    var report = [];
    parameters.names.forEach(function (name, index) {
      var ref = refs.filter(function (item) {
        return item.name === name;
      })[0];
      if (!ref) throw new Error('Sync gate Symbol not importable: ' + name);
      var instance = ref.import().createNewInstance();
      instance.parent = consumer.selectedPage;
      instance.frame.y = index * 160;
      var strings = instance.overrides.filter(function (item) {
        return item.property === 'stringValue';
      });
      if (strings.length < 2)
        throw new Error('Sync gate needs two Text layers: ' + name);
      // Override the last label; the first one carries the library edit.
      strings[strings.length - 1].value = 'Kept override ' + index;
      report.push({ name: name, override: 'Kept override ' + index });
    });
    session.saveDocument(consumer, parameters.consumerPath, function (error) {
      done(error, report);
    });
  } catch (error) {
    done(error);
  }
};
