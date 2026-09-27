// bitrun.js：按共用处理预算逐条处理事件，用尽的事件压账，收尾不限预算补齐。
import { setBit, bitAt } from "./bits.js";

const KINDS = { set: 1, clear: 1, test: 1 };

function BitRunError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

// 账上一条对外就是 [kind, index]；id 挂为不可枚举属性，既不污染 JSON/指纹，
// 又能在重放时区分不同事件（例如两条 test 同一档位）。
function makeLedgerItem(event) {
  const item = [event.kind, event.index];
  Object.defineProperty(item, "id", { value: event.id, enumerable: false, configurable: true });
  return item;
}

function asEvent(item) {
  return { id: item.id, kind: item[0], index: item[1] };
}

// 结构校验：与预算无关，先于一切处理，整批全量过一遍。
function validateShape(events) {
  if (!Array.isArray(events)) throw BitRunError("E_BAD_EVENT", "事件必须是数组");
  for (const event of events) {
    if (event === null || typeof event !== "object" || typeof event.kind !== "string"
      || !Object.prototype.hasOwnProperty.call(KINDS, event.kind)) {
      throw BitRunError("E_BAD_EVENT", "事件结构不合法");
    }
  }
}

function validateIndex(index, length) {
  if (typeof index !== "number" || !Number.isInteger(index)) {
    throw BitRunError("E_BAD_INDEX", "下标必须是整数");
  }
  if (index < 0) throw BitRunError("E_BAD_INDEX", "下标不能为负");
  if (index >= length) throw BitRunError("E_OUT_OF_RANGE", "下标超出位串长度");
}

function cloneState(state) {
  return {
    bits: state.bits,
    reads: state.reads.slice(),
    ledger: state.ledger.slice(),
    applied: state.applied.slice()
  };
}

function applyEvent(state, event) {
  validateIndex(event.index, state.bits.length);
  if (event.kind === "set") {
    state.bits = setBit(state.bits, event.index, 1);
  } else if (event.kind === "clear") {
    state.bits = setBit(state.bits, event.index, 0);
  } else {
    state.reads.push([event.index, bitAt(state.bits, event.index)]);
  }
}

function drain(spec, unlimited) {
  validateShape(spec.events);
  const state = cloneState(spec.state || { bits: "", reads: [], ledger: [], applied: [] });
  const appliedSet = new Set(state.applied);

  // 队列：先账上存量、后新到事件，按 id 去重已处理，保持全局先后顺序。
  const queue = state.ledger.map(asEvent);
  for (const event of spec.events) {
    if (appliedSet.has(event.id)) continue;
    queue.push(event);
  }

  let budget = unlimited ? Infinity : (Number.isFinite(spec.budget) ? Math.max(0, Math.floor(spec.budget)) : 0);
  let served = 0;
  state.ledger = [];

  for (const event of queue) {
    if (budget <= 0) { state.ledger.push(makeLedgerItem(event)); continue; }
    applyEvent(state, event);
    appliedSet.add(event.id);
    state.applied = Array.from(appliedSet);
    budget -= 1;
    served += 1;
  }

  return { state, served };
}

export function step(spec) {
  const result = drain(spec, false);
  return {
    state: result.state,
    served: result.served,
    ledger_before: result.state.ledger.length,
    ledger: result.state.ledger,
    judged: result.served,
    judged_bound: (spec.state && spec.state.ledger ? spec.state.ledger.length : 0) + (spec.events || []).length
  };
}

export function close(spec) {
  validateShape(spec.events || []);
  const result = drain(Object.assign({}, spec, { events: [], budget: Infinity }), true);
  return { state: result.state, catchup: result.served };
}
