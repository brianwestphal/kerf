// Verify linked Variant Set consumers across all six unified Library pages.
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
      var report = {
        pages: pages,
        symbols: dom.find('SymbolMaster', library).length,
        variantSets: library.getVariantSets().length,
        swatches: library.swatches.length,
        layerStyles: library.sharedLayerStyles.length,
        textStyles: library.sharedTextStyles.length,
        instances: [],
      };
      session.closeDocument(library);
      var consumer = session.createDocument();
      consumer.selectedPage.name = 'Kerf UI Library Instances';
      var libraryReference = session.library(parameters.libraryPath);
      report.importableSymbolReferences =
        libraryReference.getImportableSymbolReferencesForDocument(
          consumer,
        ).length;
      var refs =
        libraryReference.getImportableVariantSetReferencesForDocument(consumer);
      if (refs.length !== parameters.variantSets.length)
        throw new Error('Unified Library Variant Set reference count changed');
      parameters.representatives.forEach(function (choice, groupIndex) {
        session.check();
        var ref = refs.filter(function (item) {
          return item.name === choice.setName;
        })[0];
        if (!ref)
          throw new Error('Variant Set not importable: ' + choice.setName);
        var set = ref.import();
        var foreign = !!set.sketchObject.foreignObject();
        ['Light', 'Dark'].forEach(function (theme, themeIndex) {
          var master = set.getBestVariantMasterForConfiguration({
            State: choice.state,
            Theme: theme,
          });
          var instance = master.createNewInstance();
          instance.parent = consumer.selectedPage;
          instance.frame.x = themeIndex * 600;
          instance.frame.y = groupIndex * 200;
          var override = instance.overrides.filter(function (item) {
            return item.property === 'stringValue';
          })[0];
          if (!override)
            throw new Error('Text override missing: ' + choice.setName);
          override.value = 'Done ' + groupIndex + themeIndex;
          if (choice.setName === 'Button')
            instance.horizontalSizing = dom.FlexSizing.Fixed;
          instance.frame.width += 80;
          dom.export(instance, {
            formats: 'png',
            scales: '2',
            output: parameters.exportsPath,
            filename:
              choice.page.replace(/\W+/g, '-').toLowerCase() +
              '-' +
              (groupIndex * 2 + themeIndex),
            overwriting: true,
          });
          report.instances.push({
            page: choice.page,
            set: choice.setName,
            state: choice.state,
            theme: theme,
            name: master.name,
            symbolId: master.symbolId,
            linked: foreign,
            override: override.value,
            width: instance.frame.width,
          });
        });
      });
      session.saveDocument(
        consumer,
        parameters.consumerPath,
        function (saveError) {
          if (saveError) return done(saveError);
          session.closeDocument(consumer);
          session.openDocument(
            parameters.consumerPath,
            function (reopenError, reopened) {
              if (reopenError) return done(reopenError);
              try {
                report.foreignVariantSets = reopened
                  ._getMSDocumentData()
                  .foreignVariantSets()
                  .count();
                report.reopened = dom
                  .find('SymbolInstance', reopened)
                  .map(function (instance) {
                    var value = instance.overrides.filter(function (item) {
                      return item.property === 'stringValue' && !item.isDefault;
                    })[0];
                    return {
                      symbolId: instance.symbolId,
                      name: instance.master.name,
                      override: value ? value.value : null,
                      width: instance.frame.width,
                    };
                  });
                done(null, report);
              } catch (failure) {
                done(failure);
              }
            },
          );
        },
      );
    } catch (failure) {
      done(failure);
    }
  });
};
