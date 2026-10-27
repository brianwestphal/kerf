module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  var cases = ['long', 'fixed', 'manual'];
  var themes = ['Light', 'Dark'];
  var report = [];
  var index = 0;
  function next() {
    if (index === cases.length * themes.length) return done(null, report);
    try {
      session.check();
      var kind = cases[Math.floor(index / themes.length)];
      var theme = themes[index % themes.length];
      index++;
      var consumer = session.createDocument();
      consumer.selectedPage.name = 'SplitButton Truncation Probe';
      var library = session.library(parameters.libraryPath);
      var name = 'Split Button / Tones / Deploy / ' + theme;
      var ref = library
        .getImportableSymbolReferencesForDocument(consumer)
        .filter(function (item) {
          return item.name === name;
        })[0];
      if (!ref) throw new Error('SplitButton reference missing: ' + name);
      var master = ref.import();
      var label = dom.find('Text', master).filter(function (item) {
        return item.name === 'Label';
      })[0];
      if (!label) throw new Error('Editable SplitButton Label missing.');
      if (kind === 'fixed') {
        label.fixedWidth = true;
        label.horizontalSizing = dom.FlexSizing.Fixed;
        label.frame.width = 49;
      }
      var instance = master.createNewInstance();
      instance.parent = consumer.selectedPage;
      var override = instance.overrides.filter(function (item) {
        return item.property === 'stringValue';
      })[0];
      if (!override) throw new Error('SplitButton text override missing.');
      override.value = kind === 'manual' ? 'Upd…' : 'Updated split-button';
      var natural = instance.frame.width;
      function exportAt(size) {
        dom.export(instance, {
          formats: 'png',
          scales: '2',
          output: parameters.exportsPath,
          filename: kind + '-' + theme.toLowerCase() + '-' + size,
          overwriting: true,
        });
      }
      exportAt('natural');
      instance.frame.width = natural + 80;
      exportAt('wide');
      var item = {
        kind: kind,
        theme: theme.toLowerCase(),
        override: override.value,
        linked: !!master.getLibrary(),
        labelFixedWidth: label.fixedWidth,
        labelWidth: label.frame.width,
        naturalWidth: natural,
        wideWidth: instance.frame.width,
        height: instance.frame.height,
      };
      if (!item.linked) throw new Error('Probe instance lost Library link.');
      report.push(item);
      if (kind !== 'manual') {
        session.closeDocument(consumer);
        next();
        return;
      }
      var path = parameters.consumerPath.replace(
        /\.sketch$/,
        '-' + item.theme + '.sketch',
      );
      session.saveDocument(consumer, path, function (saveError) {
        if (saveError) return done(saveError);
        session.closeDocument(consumer);
        session.openDocument(path, function (openError, reopened) {
          if (openError) return done(openError);
          try {
            var reopenedInstance = dom.find('SymbolInstance', reopened)[0];
            if (
              !reopenedInstance ||
              !reopenedInstance.overrides.some(function (value) {
                return (
                  value.property === 'stringValue' && value.value === 'Upd…'
                );
              })
            )
              throw new Error(
                'Manual ellipsis override did not survive save/reopen.',
              );
            item.reopened = true;
            session.closeDocument(reopened);
            next();
          } catch (failure) {
            done(failure);
          }
        });
      });
    } catch (failure) {
      done(failure);
    }
  }
  next();
};
