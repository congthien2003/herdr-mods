import { SessionClock } from "./session-clock.js";
import { openOverlay } from "./bridge.js";
// Agent quota in the status bar: one slim bar per limit window, from `quota-axi --json`.
// Click for read-only quota details. The same mod draws the popup (props().menu).
import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { runQuotaCommand } from "./quota-command.js";
import { exec, theme, settings, shared, setShared, props, knownAgents, nextCommand, spaces } from "herdr";

const EVERY = 120000, STALE = 10 * 60000;
const ICONS = { claude: "claude", codex: "codex" };
const allowed = p => p.id === "claude" || p.id === "codex";
const providers = data => (data?.providers ?? []).filter(allowed);
const TINT = { claude: "#d97757" };

// Presentation is fixed: used percentages, only 5-hour limits in the status bar.
const sessionWindows = p => p.windows.filter(w => w.kind === "session"
  && (w.windowSeconds == null || w.windowSeconds === 5 * 3600));
const signedIn = p => p.windows.length > 0;
const quotaMachine = () => props()?.menu ? props().machine ?? null : spaces().find(s => s.active)?.machine ?? null;
const stateKey = (name, on = quotaMachine()) => `${name}:${JSON.stringify(on)}`;

// Calm until it matters: green, amber from 60%, orange from 80%, red from 92%.
function level(pct) {
  const dark = settings().dark !== false;
  const scale = dark ? ["#5ed49a", "#f2c14e", "#f59152", "#f2665c"] : ["#1f9d63", "#c98a0b", "#dd6b20", "#d64545"];
  return scale[pct >= 92 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0];
}

// Share of the window already gone, 0..1; null without a reset time.
function elapsed(w, now) {
  if (!w.resetsAt || !w.windowSeconds) return null;
  const left = (Date.parse(w.resetsAt) - now) / 1000;
  return Math.min(1, Math.max(0, 1 - left / w.windowSeconds));
}

function until(iso, now) {
  const min = Math.max(0, Math.round((Date.parse(iso) - now) / 60000));
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h ${min % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

function ago(at, now) {
  const min = Math.round((now - at) / 60000);
  return min < 1 ? "just now" : `${min}m ago`;
}

function pace(w, now) {
  const e = elapsed(w, now);
  if (e === null || e < 0.03) return null;
  const diff = Math.round(w.percentUsed - e * 100);
  return { diff, ahead: diff >= 10 && w.percentUsed >= 20 };
}

const percentText = w => `${Math.round(w.percentUsed)}% used`;

// A null width lets the track fill the space between the label and percentage.
function bar(w, width, height, now, t) {
  const e = elapsed(w, now), pct = Math.min(100, Math.max(0, w.percentUsed));
  return div().relative().h(height).rounded(height / 2).bg(t.border)
    .when(width !== null, el => el.w(width).flex_none())
    .when(width === null, el => el.flex_1().min_w(0))
    .child(div().absolute().left(0).top(0).h(height).w(`${pct}%`).rounded(height / 2).bg(level(w.percentUsed)))
    .when(e !== null, el => el.child(div().absolute().top(-2).h(height + 4).w(1).left(`${e * 100}%`).bg(t.foreground).opacity(0.45)));
}

async function load(on = null) {
  let r = await runQuotaCommand(exec, { on }).catch(e => ({ code: -1, stderr: String(e) }));
  // Apps started from the Dock miss PATH entries set in the shell's rc file (npm, nvm, mise): ask the person's own shell.
  if (r.code !== 0) r = await exec("sh", ["-c", 'exec "${SHELL:-/bin/sh}" -lic "quota-axi --json" </dev/null'], { on }).catch(e => ({ code: -1, stderr: String(e) }));
  if (r.code !== 0) throw new Error(`quota-axi failed: ${(r.stderr || "").trim().split("\n").pop() || `exit ${r.code}`}`);
  // An interactive shell can print a banner first; the report starts at the first brace.
  const data = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
  return {
    at: Date.now(),
    providers: (data.providers ?? []).filter(p => p.provider === "claude" || p.provider === "codex").map(p => ({
      id: p.provider, label: p.label ?? p.provider, plan: p.plan ?? null, status: p.state?.status ?? null,
      windows: (p.windows ?? []).map(w => ({
        id: w.id, label: w.label, kind: w.kind, shareOf: w.shareOf ?? null,
        // Newer quota-axi reports remaining percentages; shares are not independent allowances.
        percentUsed: Number.isFinite(w.percentUsed) ? w.percentUsed
          : w.shareOf == null && Number.isFinite(w.percentRemaining) ? 100 - w.percentRemaining : null,
        resetsAt: w.resetsAt ?? null, windowSeconds: w.windowSeconds ?? null,
      })).filter(w => Number.isFinite(w.percentUsed)),
    })),
  };
}

export default class Quota extends View {
  init(_props, cx) {
    // The app's program table knows each agent's icon and whether it is a one-color glyph.
    this.programs = {};
    this.loading = new Set();
    cx.spawn(async cx => {
      const list = await knownAgents().catch(() => []);
      for (const a of list) this.programs[a.key] = a;
      cx.notify();
    });
    if (props()?.menu) return;
    this.clock = new SessionClock();
    this.clock.init(cx);
    this.machine = quotaMachine();
    this.refresh(cx);
    cx.timer.every(EVERY, cx => this.refresh(cx));
    // Key commands: "quota:menu" opens the popup, "quota:refresh" reads the quota now.
    cx.spawn(async cx => {
      for (;;) {
        const c = await nextCommand();
        if (c === "menu") this.openMenu();
        if (c === "refresh") this.refresh(cx);
      }
    });
  }

  glyph(p, size, t) {
    const program = this.programs[p.id], icon = program?.icon ?? (ICONS[p.id] ? `icons/${ICONS[p.id]}.svg` : null);
    if (!icon) return div().size(6).rounded(3).flex_none().bg(t.dim);
    const el = TINT[p.id] || !program || program.tint
      ? svg(icon).size(size).flex_none().text_color(TINT[p.id] ?? program?.color ?? t.foreground)
      : image(icon).size(size).flex_none().rounded(3);
    return signedIn(p) ? el : el.opacity(0.35);
  }

  refresh(cx) {
    const on = quotaMachine();
    if (this.loading.has(on)) return;
    this.loading.add(on);
    cx.spawn(async cx => {
      try { setShared(stateKey("quota.data", on), await load(on)); setShared(stateKey("quota.error", on), null); }
      catch (e) { setShared(stateKey("quota.error", on), String(e.message ?? e)); }
      finally { this.loading.delete(on); cx.notify(); }
    });
  }

  openMenu() {
    const data = shared(stateKey("quota.data"));
    const details = providers(data).reduce((n, p) => n + 34 + Math.max(1, p.windows.length) * 44, 0);
    openOverlay({ mod: "simple-workspace", kind: "popup", width: 300,
      height: Math.min(620, Math.max(130, 86 + details)),
      props: { menu: true, machine: quotaMachine() } });
  }

  render(cx) {
    const t = theme();
    if (props()?.menu) return this.menu(t);
    const on = quotaMachine();
    if (on !== this.machine) { this.machine = on; this.refresh(cx); }
    const data = shared(stateKey("quota.data")), error = shared(stateKey("quota.error")), now = Date.now();
    const stale = !data || now - data.at > STALE;
    const list = providers(data);
    const width = this.width ?? Infinity;
    const barW = width >= list.length * 110 + 24 ? 34 : width >= list.length * 90 + 24 ? 20 : 0;
    const parts = [];
    list.forEach((p, i) => {
      if (i > 0) parts.push(div().w(1).h(12).flex_none().bg(t.border));
      const windows = sessionWindows(p);
      parts.push(h_flex().id(`q-${p.id}`).gap(6).items_center().flex_none()
        .tooltip(windows.map(w => `${p.label} 5h: ${percentText(w)}${w.resetsAt && Date.parse(w.resetsAt) > now ? `, resets in ${until(w.resetsAt, now)}` : ""}`).join("\n")
          || `${p.label}: ${signedIn(p) ? "5h quota unavailable" : "not signed in"}`)
        .child(this.glyph(p, 12, t))
        .child(div().text_size(10).text_color(t.dim).child("5h"))
        .when(!windows.length, el => el.child(div().text_size(11).text_color(t.dim).child("—")))
        .children(windows.map(w => h_flex().gap(5).items_center()
          .when(barW > 0, el => el.child(bar(w, barW, 4, now, t)))
          .child(div().min_w(28).text_size(11).text_color(w.percentUsed >= 60 ? level(w.percentUsed) : t.muted).child(`${Math.round(w.percentUsed)}%`)))));
    });
    const quota = h_flex().id("quota").size_full().px(8).gap(9).items_center().justify_end().overflow_hidden()
      .bg(t.chrome).border_t(1).border_color(t.border).text_size(11.5).text_color(t.muted).cursor_pointer()
      .on_size_change((size, cx) => { const w = size.width / (settings().zoom || 1); if (w !== this.width) { this.width = w; cx.notify(); } })
      .tooltip(`5-hour quota used on ${on ?? "this computer"}`)
      .when(stale, el => el.opacity(0.6))
      .on_click(() => this.openMenu())
      .on_mouse_down("right", () => this.openMenu())
      .when(parts.length === 0, el => el.child(div().text_color(t.dim).child(error ? "Quota unavailable" : data ? "No quota to show" : "Loading quota…")))
      .children(parts);
    return h_flex().id("quota-and-session").size_full().min_w(0).items_center()
      .child(div().flex_1().min_w(0).h_full().child(quota))
      .child(this.clock.render());
  }

  menu(t) {
    const data = shared(stateKey("quota.data")), error = shared(stateKey("quota.error")), now = Date.now();
    const all = providers(data);
    const details = all.map(p => v_flex().w_full().px(8).py(6).gap(6)
      .child(h_flex().w_full().gap(6).items_center()
        .child(this.glyph(p, 13, t))
        .child(div().font_semibold().text_color(t.foreground).child(p.label))
        .child(div().text_size(10.5).text_color(t.dim).child(signedIn(p) ? (p.plan ?? "") : "not signed in")))
      .children(p.windows.map(w => {
        const pc = pace(w, now);
        return v_flex().w_full().gap(3)
          .child(h_flex().w_full().gap(8).items_center()
            .child(div().w(62).flex_none().truncate().text_size(11.5).text_color(t.muted)
              .child(w.kind === "session" ? (w.windowSeconds ? `${Math.round(w.windowSeconds / 3600)} hours` : "5 hours") : w.kind === "weekly" ? "Week" : w.label ?? w.kind))
            .child(bar(w, null, 5, now, t))
            .child(div().w(38).flex_none().text_right().text_size(11.5).text_color(w.percentUsed >= 60 ? level(w.percentUsed) : t.foreground).child(`${Math.round(w.percentUsed)}%`)))
          .child(div().pl(70).text_size(10.5).text_color(t.dim).child([
            w.resetsAt && Date.parse(w.resetsAt) > now ? `resets in ${until(w.resetsAt, now)}` : null,
            pc ? (Math.abs(pc.diff) < 5 ? "on pace" : pc.diff > 0 ? `${pc.diff}% ahead of pace` : `${-pc.diff}% under pace`) : null,
          ].filter(Boolean).join(" · ")));
      })));
    return v_flex().id("quota-menu").w_full().p(5).bg(t.popover).text_size(12.5).overflow_y_scrollbar()
      .child(h_flex().w_full().px(8).pt(4).pb(2).items_center()
        .child(div().flex_1().text_size(11).text_color(t.dim).child(data ? `Quota used · ${ago(data.at, now)}` : "Agent quota"))
        .child(div().id("quota-refresh").px(6).rounded(5).cursor_pointer().text_size(11).text_color(t.muted).hover(s => s.bg(t.hover))
          .on_click((_event, cx) => this.refresh(cx)).child("Refresh")))
      .child(div().px(8).py(4).text_size(11).text_color(t.muted).child(`Machine: ${quotaMachine() ?? "This computer"}`))
      .when(Boolean(error), el => el.child(div().px(8).py(4).text_size(11).text_color(level(95)).child(error)))
      .when(all.length === 0, el => el.child(div().px(8).py(8).text_color(t.dim).child(data ? "No quota to show" : "Loading quota…")))
      .children(details);
  }
}
