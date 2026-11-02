// Groups live in shared "space-groups" on the computer running the app:
// { groups: [{ id, name, machine, folded }] in the order shown, spaces: { <space id>: <group id> } }.
// A space id already carries its machine ("server/s3"; local ones have none), and a
// group only holds spaces of its own machine.

import { shared, setShared, spaces, machines } from "herdr";

export const MOD = "simple-workspace";
const KEY = "space-groups";

export function load() {
  const raw = shared(KEY) ?? {};
  const groups = (Array.isArray(raw.groups) ? raw.groups : [])
    .filter((g) => typeof g?.id === "string" && typeof g?.name === "string")
    .map((g) => ({ id: g.id, name: g.name, machine: g.machine ?? null, folded: Boolean(g.folded) }));
  const ids = new Set(groups.map((g) => g.id));
  const members = Object.fromEntries(Object.entries(raw.spaces ?? {}).filter(([, g]) => ids.has(g)));
  return { groups, spaces: members };
}

function save(state) {
  setShared(KEY, state);
}

export const groupsOn = (state, machine) => state.groups.filter((g) => g.machine === (machine ?? null));

export function groupOf(state, space) {
  const g = state.groups.find((g) => g.id === state.spaces[space.id]);
  return g && g.machine === (space.machine ?? null) ? g : null;
}

export function assign(spaceId, groupId) {
  const state = load();
  if (groupId) state.spaces[spaceId] = groupId;
  else delete state.spaces[spaceId];
  save(state);
}

export function create(name, machine) {
  const state = load();
  const id = `g${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  state.groups.push({ id, name, machine: machine ?? null, folded: false });
  save(state);
  return id;
}

export function rename(groupId, name) {
  const state = load();
  const g = state.groups.find((g) => g.id === groupId);
  if (!g) return;
  g.name = name;
  save(state);
}

export function remove(groupId) {
  const state = load();
  state.groups = state.groups.filter((g) => g.id !== groupId);
  state.spaces = Object.fromEntries(Object.entries(state.spaces).filter(([, g]) => g !== groupId));
  save(state);
}

export function reorder(groupId, targetId, after) {
  const state = load();
  const g = state.groups.find((g) => g.id === groupId);
  const target = state.groups.find((g) => g.id === targetId);
  if (!g || !target || g === target || g.machine !== target.machine) return;
  state.groups.splice(state.groups.indexOf(g), 1);
  state.groups.splice(state.groups.indexOf(target) + (after ? 1 : 0), 0, g);
  save(state);
}

export function shift(groupId, by) {
  const state = load();
  const g = state.groups.find((g) => g.id === groupId);
  const mine = g ? groupsOn(state, g.machine) : [];
  const target = mine[mine.indexOf(g) + by];
  if (target) reorder(groupId, target.id, by > 0);
}

export function toggle(groupId) {
  const state = load();
  const g = state.groups.find((g) => g.id === groupId);
  if (!g) return;
  g.folded = !g.folded;
  save(state);
}

export function unfold(groupId) {
  const state = load();
  const g = state.groups.find((g) => g.id === groupId);
  if (!g?.folded) return;
  g.folded = false;
  save(state);
}

export const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// A closed space leaves its group. Only once its machine's spaces could be read:
// a machine that is away or still loading shows none of them.
export function prune() {
  const raw = shared(KEY);
  if (!raw) return;
  const state = load();
  const ready = new Set(machines().filter((m) => m.layout === "ready").map((m) => m.name ?? null));
  const live = new Set(spaces().map((s) => s.id));
  const machineOf = Object.fromEntries(state.groups.map((g) => [g.id, g.machine]));
  const kept = Object.fromEntries(Object.entries(state.spaces).filter(([id, g]) => live.has(id) || !ready.has(machineOf[g])));
  if (Object.keys(kept).length !== Object.keys(raw.spaces ?? {}).length) save({ ...state, spaces: kept });
}
