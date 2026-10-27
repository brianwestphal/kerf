/* The injected adapter keeps this ownership/state machine testable in Node. */
module.exports = function createSession(adapter, job) {
  var dom = adapter.dom;
  var documents = [];
  var libraries = [];
  var protectedDocuments = dom.getDocuments().map(function (d) {
    return d.id;
  });
  var protectedLibraries = dom.Library.getLibraries().map(function (l) {
    return l.id;
  });
  var pending = 0;
  var outcome = null;
  var finished = false;
  var cleanupErrors = [];
  var fiber = adapter.createFiber();
  var timer;

  function journal() {
    adapter.write('resources.json', {
      runId: job.runId,
      processId: adapter.processId,
      documents: documents.map(function (d) {
        return d.id;
      }),
      libraries: libraries.map(function (l) {
        return l.id;
      }),
      protectedDocuments: protectedDocuments,
      protectedLibraries: protectedLibraries,
    });
  }
  function active() {
    if (finished || outcome) throw new Error('Sketch session is finishing.');
    if (adapter.cancelled() || adapter.now() >= job.deadline) {
      finish(new Error('Sketch job cancelled or timed out.'));
      throw new Error('Sketch job cancelled or timed out.');
    }
  }
  function cleanup() {
    if (finished) return;
    finished = true;
    if (timer) timer.invalidate();
    documents
      .slice()
      .reverse()
      .forEach(function (document) {
        if (protectedDocuments.indexOf(document.id) !== -1) return;
        try {
          document.close();
        } catch (e) {
          cleanupErrors.push(String(e));
        }
      });
    libraries
      .slice()
      .reverse()
      .forEach(function (library) {
        if (protectedLibraries.indexOf(library.id) !== -1) return;
        try {
          library.remove();
        } catch (e) {
          cleanupErrors.push(String(e));
        }
      });
    var error = outcome && outcome.error;
    adapter.write('status.json', {
      runId: job.runId,
      processId: adapter.processId,
      state:
        error || cleanupErrors.length
          ? 'failed'
          : outcome
            ? 'succeeded'
            : 'cancelled',
      error: error
        ? String(error)
        : cleanupErrors.length
          ? 'Sketch resource cleanup failed.'
          : outcome
            ? null
            : 'Sketch terminated the session.',
      result: outcome && outcome.result,
      cleanupComplete: cleanupErrors.length === 0,
      cleanupErrors: cleanupErrors,
      documentsBefore: protectedDocuments,
      documentsAfter: dom.getDocuments().map(function (d) {
        return d.id;
      }),
      librariesBefore: protectedLibraries,
      librariesAfter: dom.Library.getLibraries().map(function (l) {
        return l.id;
      }),
    });
    if (adapter.finished) adapter.finished(cleanupErrors.length === 0);
  }
  function settle() {
    if (outcome && pending === 0 && !finished) fiber.cleanup();
  }
  function finish(error, result) {
    if (finished || outcome) return;
    outcome = { error: error, result: result };
    settle();
  }
  function operation(start, callback) {
    active();
    pending++;
    var called = false;
    try {
      start(function (error, result) {
        if (called) return;
        called = true;
        try {
          // Always register a newly opened document before honoring cancellation.
          // Its async callback must finish before the fiber can be collected.
          if (callback) callback(error, result);
          else if (error) finish(error);
        } catch (e) {
          finish(e);
        } finally {
          pending--;
          settle();
        }
      });
    } catch (e) {
      if (!called) pending--;
      finish(e);
    }
  }
  fiber.onCleanup(cleanup);
  journal();
  adapter.write('status.json', {
    runId: job.runId,
    processId: adapter.processId,
    state: 'running',
    cleanupComplete: false,
  });
  timer = adapter.every(function () {
    if (adapter.cancelled() || adapter.now() >= job.deadline)
      finish(new Error('Sketch job cancelled or timed out.'));
  });
  var session = {
    dom: dom,
    parameters: job.parameters,
    jobDirectory: job.jobDirectory,
    check: active,
    done: finish,
    createDocument: function () {
      active();
      var document = new dom.Document();
      documents.push(document);
      journal();
      return document;
    },
    closeDocument: function (document) {
      active();
      var index = documents.indexOf(document);
      if (index === -1 || protectedDocuments.indexOf(document.id) !== -1)
        throw new Error('Cannot close a document not owned by this session.');
      document.close();
      documents.splice(index, 1);
      journal();
    },
    openDocument: function (path, callback) {
      var before = dom.getDocuments().map(function (d) {
        return d.id;
      });
      operation(
        function (done) {
          dom.Document.open(path, done);
        },
        function (error, document) {
          if (document && before.indexOf(document.id) === -1) {
            documents.push(document);
            journal();
          }
          if (outcome) return;
          if (callback) callback(error, document);
          else if (error) finish(error);
        },
      );
    },
    saveDocument: function (document, path, callback) {
      operation(
        function (done) {
          document.save(path, { saveMode: dom.Document.SaveMode.SaveTo }, done);
        },
        function (error) {
          if (outcome) return;
          if (callback) callback(error);
          else if (error) finish(error);
        },
      );
    },
    library: function (path) {
      active();
      var before = dom.Library.getLibraries().map(function (l) {
        return l.id;
      });
      var library = dom.Library.getLibraryForDocumentAtPath(path);
      if (before.indexOf(library.id) === -1) {
        libraries.push(library);
        journal();
      }
      return library;
    },
    finish: finish,
  };
  return session;
};
