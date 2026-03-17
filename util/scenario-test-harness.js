'use strict';

const path = require('path');
const { fork } = require('child_process');

function createScenarioHarness(options = {}) {
  const root = options.root || process.cwd();
  const hostPath = path.join(__dirname, 'scenario-harness-host.js');
  const child = fork(hostPath, [], {
    cwd: root,
    env: {
      ...process.env,
      SCENARIO_HARNESS_ROOT: root,
    },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });

  let nextRequestId = 1;
  let ready = false;
  let closed = false;
  const pending = new Map();
  let runQueue = Promise.resolve();
  let readyResolve;
  let readyReject;
  const readyPromise = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const rejectAll = (error) => {
    for (const { reject } of pending.values()) {
      reject(error);
    }
    pending.clear();
  };

  child.on('message', (message) => {
    if (!message || typeof message !== 'object') {
      return;
    }

    if (message.type === 'ready') {
      ready = true;
      readyResolve();
      return;
    }

    if (message.type === 'response') {
      const pendingRequest = pending.get(message.id);
      if (!pendingRequest) {
        return;
      }

      pending.delete(message.id);
      if (message.error) {
        const error = new Error(message.error.message);
        error.stack = message.error.stack || error.stack;
        pendingRequest.reject(error);
      } else {
        pendingRequest.resolve(message.result);
      }
      return;
    }

    if (message.type === 'close-error' && message.error) {
      const error = new Error(message.error.message);
      error.stack = message.error.stack || error.stack;
      rejectAll(error);
    }
  });

  child.once('error', (error) => {
    if (!ready) {
      readyReject(error);
    }
    rejectAll(error);
  });

  child.once('exit', (code, signal) => {
    if (!ready) {
      readyReject(new Error(`scenario harness exited before ready (code=${code}, signal=${signal})`));
    }
    if (!closed) {
      rejectAll(new Error(`scenario harness exited unexpectedly (code=${code}, signal=${signal})`));
    }
  });

  return {
    get pid() {
      return child.pid;
    },
    async runScenario(args) {
      const scheduled = runQueue.then(async () => {
        await readyPromise;
        const id = nextRequestId;
        nextRequestId += 1;
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          child.send({ type: 'run', id, args });
        });
      });

      runQueue = scheduled.catch(() => undefined);
      return scheduled;
    },
    async close() {
      if (closed) {
        return;
      }

      closed = true;
      await runQueue.catch(() => undefined);
      await readyPromise;
      await new Promise((resolve) => {
        child.once('exit', () => resolve());
        child.send({ type: 'close' });
      });
    },
  };
}

module.exports = {
  createScenarioHarness,
};
