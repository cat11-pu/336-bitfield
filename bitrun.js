// bitrun.js：按处理预算处理并留账
import { setBit, bitAt } from "./bits.js";

const WRITE = { set: "1", clear: "0" };

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codes(spec) {
  return {
    event: spec.event_error_code || "E_BAD_EVENT",
    index: spec.index_error_code || "E_BAD_INDEX",
    range: spec.range_error_code || "E_OUT_OF_RANGE"
  };
}

// 结构校验与预算无关：整批事件先过一遍，不合法直接报。
function validateEvent(event, err) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail(err.event, "event must be a plain object");
  }
  if (event.kind !== "set" && event.kind !== "clear" && event.kind !== "test") {
    fail(err.event, "unknown event kind");
  }
  if (!Number.isInteger(event.index)) {
    fail(err.event, "index must be an integer");
  }
  if (event.index < 0) {
    fail(err.index, "index must not be negative");
  }
}

// 真正处理一条：越界按当前位串长度判，在处理的那一刻才撞得上。
function apply(state, kind, index, id, err) {
  if (index >= state.bits.length) {
    fail(err.range, "index out of range");
  }
  if (kind === "test") {
    state.reads.push([index, bitAt(state.bits, index)]);
  } else {
    state.bits = setBit(state.bits, index, WRITE[kind]);
  }
  if (id !== undefined) {
    state.applied.push(id);
  }
}

function cloneState(source) {
  return {
    bits: source.bits,
    reads: source.reads.slice(),
    ledger: source.ledger.map(function (entry) { return entry.slice(); }),
    applied: source.applied.slice()
  };
}

export function step(spec) {
  const err = codes(spec);
  const events = spec.events || [];
  events.forEach(function (event) { validateEvent(event, err); });
  const state = cloneState(spec.state);
  const carry = state.ledger;
  const ledger = [];
  let budget = spec.budget;
  let served = 0;
  let judged = 0;
  // 上一轮压的账先还，再办本轮新事件，共用同一份预算。
  carry.forEach(function (entry) {
    if (budget > 0) {
      budget -= 1;
      apply(state, entry[0], entry[1], entry[2], err);
      served += 1;
      judged += 1;
    } else {
      ledger.push(entry);
    }
  });
  events.forEach(function (event) {
    if (event.id !== undefined && state.applied.indexOf(event.id) !== -1) return;
    if (budget > 0) {
      budget -= 1;
      apply(state, event.kind, event.index, event.id, err);
      served += 1;
    } else {
      ledger.push(event.id === undefined
        ? [event.kind, event.index]
        : [event.kind, event.index, event.id]);
    }
    judged += 1;
  });
  state.ledger = ledger;
  return {
    state: state,
    served: served,
    ledger_before: ledger.length,
    ledger: ledger.map(function (pair) { return [pair[0], pair[1]]; }),
    judged: judged,
    judged_bound: events.length + carry.length
  };
}

export function close(spec) {
  const err = codes(spec);
  const state = cloneState(spec.state);
  const pending = state.ledger;
  let catchup = 0;
  // 收尾不限预算，把账上的事件逐条补齐。
  pending.forEach(function (entry) {
    apply(state, entry[0], entry[1], entry[2], err);
    catchup += 1;
  });
  state.ledger = [];
  return { state: state, catchup: catchup };
}
