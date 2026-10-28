// Verify the unified Library: every family page and master is present, and
// a consumer linked to one master per family and theme keeps its Library
// link, a text override, and an 80px resize through save/reopen.
module.exports.run = function (session, parameters, done) {
  var dom = session.dom;
  session.openDocument(parameters.libraryPath, function (openError, library) {
    if (openError) return done(openError);
    try {
      var pages = library.pages.map(function (page) {
        return page.name;
      });
      parameters.families.forEach(function (family) {
        if (pages.indexOf(family) < 0)
          throw new Error('Unified Library page missing: ' + family);
      });
      var selected = [];
      library.pages.forEach(function (page) {
        ['Light', 'Dark'].forEach(function (theme) {
          var master = dom.find('SymbolMaster', page).filter(function (item) {
            return (
              / (Light|Dark)$/.test(item.name) &&
              item.name.slice(-theme.length) === theme &&
              dom.find('Text', item).length > 0
            );
          })[0];
          if (!master)
            throw new Error('No ' + theme + ' master on ' + page.name);
          selected.push({ page: page.name, name: master.name });
        });
      });
      var report = {
        pages: pages,
        symbols: dom.find('SymbolMaster', library).length,
        swatches: library.swatches.length,
        layerStyles: library.sharedLayerStyles.length,
        textStyles: library.sharedTextStyles.length,
        instances: [],
      };
      session.closeDocument(library);
      var consumer = session.createDocument();
      consumer.selectedPage.name = 'Kerf UI Library Instances';
      var refs = session
        .library(parameters.libraryPath)
        .getImportableSymbolReferencesForDocument(consumer);
      if (refs.length !== report.symbols)
        throw new Error('Unified Library importable Symbol count changed.');
      selected.forEach(function (entry, index) {
        session.check();
        var ref = refs.filter(function (item) {
          return item.name === entry.name;
        })[0];
        var master = ref.import();
        var instance = master.createNewInstance();
        instance.parent = consumer.selectedPage;
        instance.frame.x = (index % 2) * 600;
        instance.frame.y = Math.floor(index / 2) * 200;
        var override = instance.overrides.filter(function (item) {
          return item.property === 'stringValue';
        })[0];
        override.value = 'Done';
        instance.frame.width += 80;
        dom.export(instance, {
          formats: 'png',
          scales: '2',
          output: parameters.exportsPath,
          filename: entry.page.replace(/\W+/g, '-').toLowerCase() + '-' + index,
          overwriting: true,
        });
        report.instances.push({
          page: entry.page,
          name: entry.name,
          linked: !!master.getLibrary(),
          override: override.value,
          width: instance.frame.width,
        });
      });
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
                  report.reopened = dom
                    .find('SymbolInstance', reopened)
                    .map(function (instance) {
                      var value = instance.overrides.filter(function (item) {
                        return (
                          item.property === 'stringValue' && !item.isDefault
                        );
                      })[0];
                      return {
                        name: instance.master.name,
                        override: value ? value.value : null,
                      };
                    });
                  done(null, report);
                } catch (failure) {
                  done(failure);
                }
              },
            );
          } catch (failure) {
            done(failure);
          }
        },
      );
    } catch (failure) {
      done(failure);
    }
  });
};
