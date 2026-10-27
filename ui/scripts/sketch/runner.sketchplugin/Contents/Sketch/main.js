var sketch = require('sketch/dom');
var async = require('sketch/async');
var timers = require('timers');
var createSession = require('./session');
var settings = require('sketch/settings');
var activeKey = 'kerfDesignActiveJob';

function read(path) {
  var value = NSString.stringWithContentsOfFile_encoding_error(
    path,
    NSUTF8StringEncoding,
    null,
  );
  if (!value) return null;
  return JSON.parse(String(value));
}
function write(path, value) {
  var ok = NSString.stringWithString(
    JSON.stringify(value, null, 2),
  ).writeToFile_atomically_encoding_error(
    path,
    true,
    NSUTF8StringEncoding,
    null,
  );
  if (!ok) throw new Error('Cannot write Sketch status: ' + path);
}
// eslint-disable-next-line no-unused-vars -- Invoked by Sketch's manifest handler.
function onRun(context) {
  var job = read(String(context.kerfJobFile));
  if (!job || !job.runId || !job.jobDirectory)
    throw new Error('Invalid Sketch job.');
  var active = settings.sessionVariable(activeKey);
  if (active && active.runId !== job.runId) {
    var prior = read(active.jobDirectory + '/status.json');
    if (!prior || !prior.cleanupComplete) {
      write(job.jobDirectory + '/status.json', {
        runId: job.runId,
        state: 'failed',
        cleanupComplete: true,
        error: 'Sketch already has an active or quarantined design job.',
      });
      return;
    }
  }
  settings.setSessionVariable(activeKey, {
    runId: job.runId,
    jobDirectory: job.jobDirectory,
  });
  var session = createSession(
    {
      dom: sketch,
      processId: Number(NSProcessInfo.processInfo().processIdentifier()),
      createFiber: function () {
        return async.createFiber();
      },
      write: function (name, value) {
        write(job.jobDirectory + '/' + name, value);
      },
      now: function () {
        return Date.now();
      },
      cancelled: function () {
        var request = read(job.jobDirectory + '/cancel.json');
        return !!request && request.runId === job.runId;
      },
      every: function (callback) {
        var interval = timers.setInterval(callback, 100);
        return {
          invalidate: function () {
            timers.clearInterval(interval);
          },
        };
      },
      finished: function (clean) {
        var current = settings.sessionVariable(activeKey);
        if (clean && current && current.runId === job.runId)
          settings.setSessionVariable(activeKey, null);
      },
    },
    job,
  );
  try {
    session.check();
    var task = require(String(job.task));
    if (!task || typeof task.run !== 'function')
      throw new Error(
        'Sketch task must export run(session, parameters, done).',
      );
    task.run(session, job.parameters, session.done);
  } catch (error) {
    session.done(error);
  }
}
// eslint-disable-next-line no-unused-vars -- Invoked by Sketch's manifest handler.
function onRecover(context) {
  var job = read(String(context.kerfJobFile));
  if (!job) throw new Error('Cannot recover a missing Sketch job.');
  var resources = read(job.jobDirectory + '/resources.json');
  var status = read(job.jobDirectory + '/status.json');
  if (status && status.runId === job.runId && status.cleanupComplete) return;
  var processId = Number(NSProcessInfo.processInfo().processIdentifier());
  // A live job in this process owns its pending native callbacks. Its timer
  // observes cancel.json and releases its fiber only after they have settled.
  if (
    resources &&
    resources.runId === job.runId &&
    resources.processId === processId
  ) {
    // A terminal cleanup failure has no pending callbacks left. Retry only
    // journaled resources, preserving every protected document and library.
    if (status && status.cleanupErrors && status.cleanupErrors.length) {
      var errors = [];
      sketch.getDocuments().forEach(function (document) {
        if (
          resources.documents.indexOf(document.id) === -1 ||
          resources.protectedDocuments.indexOf(document.id) !== -1
        )
          return;
        try {
          document.close();
        } catch (e) {
          errors.push(String(e));
        }
      });
      sketch.Library.getLibraries().forEach(function (library) {
        if (
          resources.libraries.indexOf(library.id) === -1 ||
          resources.protectedLibraries.indexOf(library.id) !== -1
        )
          return;
        try {
          library.remove();
        } catch (e) {
          errors.push(String(e));
        }
      });
      write(job.jobDirectory + '/status.json', {
        runId: job.runId,
        processId: processId,
        state: 'cancelled',
        cleanupComplete: errors.length === 0,
        cleanupErrors: errors,
      });
      if (!errors.length) settings.setSessionVariable(activeKey, null);
    }
    return;
  }
  // Another Sketch process must never clean up a live owner's resources. Only
  // acknowledge an old process when macOS says that specific PID no longer runs.
  var oldProcess =
    resources &&
    NSRunningApplication.runningApplicationWithProcessIdentifier(
      resources.processId,
    );
  if (oldProcess)
    throw new Error(
      'The owning Sketch instance is still running. Let it acknowledge cleanup.',
    );
  write(job.jobDirectory + '/status.json', {
    runId: job.runId,
    processId: processId,
    state: 'cancelled',
    error:
      'Recovered an interrupted run; its Sketch process is no longer running.',
    cleanupComplete: true,
  });
  var current = settings.sessionVariable(activeKey);
  if (current && current.runId === job.runId)
    settings.setSessionVariable(activeKey, null);
}
