module.exports.run = function (session, parameters, done) {
  var sketch = session.dom;
  var document = session.createDocument();
  new sketch.Text({
    parent: document.selectedPage,
    text: 'Kerf runner lifecycle check',
  });
  var path = session.jobDirectory + '/lifecycle.sketch';
  session.saveDocument(document, path, function (error) {
    if (error) return done(error);
    session.closeDocument(document);
    session.openDocument(path, function (error, reopened) {
      if (error) return done(error);
      session.library(path);
      if (parameters.mode === 'failure')
        return done(new Error('Intentional lifecycle-check failure.'));
      if (parameters.mode === 'hold') return;
      done(null, {
        reopened: !!reopened,
        text: sketch.find('Text', reopened)[0].text,
      });
    });
  });
};
