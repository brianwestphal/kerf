// The worker side of the crossover bench: one message at a time, same work as
// the main-thread baseline (imported from shared.js).
import { query, sum } from './shared.js';

let resident = [];

self.onmessage = (event) => {
  const msg = event.data;
  switch (msg.kind) {
    case 'ping':
      self.postMessage({ id: msg.id });
      break;
    case 'load':
      resident = msg.rows;
      self.postMessage({ id: msg.id });
      break;
    case 'query-sent':
      self.postMessage({ id: msg.id, result: query(msg.rows, msg.q) });
      break;
    case 'query-resident':
      self.postMessage({ id: msg.id, result: query(resident, msg.q) });
      break;
    case 'sum-clone':
      self.postMessage({ id: msg.id, result: sum(msg.col) });
      break;
    case 'sum-transfer':
      // Hand the buffer back so the next iteration can transfer it again.
      self.postMessage({ id: msg.id, result: sum(msg.col), col: msg.col }, [
        msg.col.buffer,
      ]);
      break;
  }
};
