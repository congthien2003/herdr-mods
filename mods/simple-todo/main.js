import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, Checkbox, Button } from "gpui-base";
import { theme, props, closeOverlay, shared, setShared, appHome, readTextFile } from "herdr";

const STORAGE_KEY = "simple-todo.items.v1";
const OPEN_KEY = "simple-todo.open-overlay";

function validateItems(items) {
  const ids = new Set();
  if (!Array.isArray(items) || !items.every(item => {
    if (!item || typeof item.id !== "string" || ids.has(item.id)
      || typeof item.text !== "string" || typeof item.done !== "boolean") return false;
    ids.add(item.id);
    return true;
  })) throw new Error("Invalid saved list");
  return items;
}

export default class SimpleTodo extends View {
  init(_props, cx) {
    this.error = "";
    this.recoveryFailed = false;
    this.loading = shared(STORAGE_KEY) == null;
    this.input = InputState.new({ placeholder: "Add a task…" });
    this.input.on("change", (_event, cx) => cx.notify());
    this.input.on("submit", (_event, cx) => this.create(cx));
    this.input.focus();
    this.handle = cx.focus_handle();
    // Use an owner token so a closing old copy cannot hide a newer popup.
    this.openOwner = `${props().overlay ?? "todo"}-${Date.now()}-${Math.random()}`;
    setShared(OPEN_KEY, this.openOwner);
    if (this.loading) cx.spawn(async cx => {
      try {
        // Recovery is read only before shared storage exists. An empty saved
        // array is intentional (Clear all), so it must never reimport tasks.
        const text = await readTextFile(`${appHome()}/data/simple-todo/recovered-items-v1.json`);
        const recovered = validateItems(text === null ? [] : JSON.parse(text));
        if (shared(STORAGE_KEY) == null) setShared(STORAGE_KEY, recovered);
      } catch (_error) {
        this.recoveryFailed = true;
        this.error = "Could not recover saved tasks. Close and reopen to retry, or Clear all to start a new list.";
      }
      this.loading = false;
      cx.notify();
    });
  }

  close() {
    // Runs for Esc, outside click, layout switches and explicit dismissal.
    if (shared(OPEN_KEY) === this.openOwner) setShared(OPEN_KEY, null);
  }

  state() {
    try {
      return { items: validateItems(shared(STORAGE_KEY) ?? []), invalid: false };
    } catch (_error) {
      return { items: [], invalid: true };
    }
  }

  save(items, cx) {
    try {
      setShared(STORAGE_KEY, validateItems(items));
      this.error = "";
      this.recoveryFailed = false;
      cx.notify();
      return true;
    } catch (_error) {
      this.error = "Could not save tasks. Please try again.";
      cx.notify();
      return false;
    }
  }

  create(cx) {
    const text = this.input.value().trim();
    const { items, invalid } = this.state();
    if (!text || this.loading || this.recoveryFailed || invalid) return;
    const item = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, text, done: false };
    if (this.save([...items, item], cx)) {
      this.input.set_value("");
      this.input.focus();
    }
  }

  render() {
    const t = theme();
    const { items, invalid } = this.state();
    const remaining = items.filter(item => !item.done).length;
    const canCreate = Boolean(this.input.value().trim()) && !this.loading && !this.recoveryFailed && !invalid;
    const canClear = !this.loading && (items.length > 0 || this.recoveryFailed || invalid);
    const error = this.error || (invalid ? "Could not read saved tasks. Clear all to start a new list." : "");
    const row = item => h_flex().id(`todo-row-${item.id}`).w_full().flex_none().min_h(34).gap(9).items_start().py(8)
      .child(Checkbox.new(`todo-check-${item.id}`).checked(item.done).size(18).flex_none()
        .rounded(4).border_1().border_color(item.done ? t.accent : t.input)
        .bg(item.done ? t.accent : t.background).text_color(t.accent_foreground)
        .cursor_pointer().accessibility_label(item.text)
        .on_change((done, cx) => {
          const state = this.state();
          if (!state.invalid) this.save(state.items.map(task => task.id === item.id ? { ...task, done } : task), cx);
        })
        .child(div().size_full().flex().items_center().justify_center().text_size(12).child(item.done ? "✓" : "")))
      .child(div().flex_1().min_w(0).text_size(12.5).text_color(item.done ? t.dim : t.foreground)
        .when(item.done, el => el.line_through()).child(item.text));
    return v_flex().id("simple-todo").w_full().h(420).min_h(0).p(14).gap(12)
      .bg(t.popover).text_color(t.foreground).track_focus(this.handle)
      .on_key_down((event, cx) => {
        if (event.key === "escape") { closeOverlay(props().overlay); cx.stop_propagation(); }
      })
      .child(h_flex().flex_none().items_center().gap(8)
        .child(div().flex_1().text_size(14).font_semibold().child("To-do"))
        .child(Button.new("todo-clear").h(26).px(8).rounded(6).text_size(11.5)
          .text_color(t.muted).disabled(!canClear).when(!canClear, el => el.opacity(0.45))
          .hover(s => s.bg(t.hover)).cursor_pointer()
          .on_click((_event, cx) => { if (canClear) this.save([], cx); }).child("Clear all")))
      .child(h_flex().flex_none().gap(8).items_center()
        .child(Input.new(this.input).flex_1().min_w(0).h(34).px(9).rounded(7)
          .border_1().border_color(t.input).bg(t.background).text_size(12.5).text_color(t.foreground))
        .child(Button.new("todo-create").h(34).px(12).flex_none().rounded(7).text_size(12)
          .bg(t.solid).text_color(t.solid_foreground).disabled(!canCreate)
          .when(!canCreate, el => el.opacity(0.45)).hover(s => s.opacity(0.85)).cursor_pointer()
          .on_click((_event, cx) => this.create(cx)).child("Create")))
      .when(Boolean(error), el => el.child(div().flex_none().text_size(11.5).text_color(t.blocked).child(error)))
      .child(v_flex().id("todo-list").flex_1().min_h(0).w_full().overflow_y_scrollbar()
        .when(this.loading, el => el.child(div().flex_none().py(24).text_size(12).text_color(t.dim).child("Loading…")))
        .when(!this.loading && items.length === 0 && !this.recoveryFailed && !invalid, el => el.child(div().flex_1().w_full().flex().items_center().justify_center().text_size(12)
          .text_color(t.dim).child("No tasks yet.")))
        .children(items.map(row)))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(`${remaining} remaining · ${items.length} total`));
  }
}
