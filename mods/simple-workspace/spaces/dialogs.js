// Move a space to a group (one of its machine's, or a new one by name), and rename
// a group. Enter picks, ↑/↓ move, Esc closes.

import { div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { props, closeOverlay, theme, spaces } from "herdr";
import { load, groupOf, groupsOn, assign, create, rename, sameName } from "./groups.js";

function frame(t, title, handle, onKey, ...children) {
  return v_flex().id("dialog").track_focus(handle).on_key_down(onKey)
    .w_full().min_h(0).p(18).gap(14).bg(t.popover).text_color(t.foreground).text_size(12.8)
    .child(h_flex().items_center()
      .child(div().flex_1().text_size(15).font_semibold().child(title))
      .child(div().text_size(11).text_color(t.dim).child("Esc")))
    .children(children);
}

const field = (t, input) => Input.new(input).h(36).px(10).rounded(9).border_1().border_color(t.accent).bg(t.background).text_size(12.8).text_color(t.foreground);

export class MoveDialog {
  init(_props, cx) {
    this.text = "";
    this.at = 0;
    this.input = InputState.new({ placeholder: "Group" });
    this.input.on("change", (_e, cx) => { this.text = this.input.value(); this.at = 0; cx.notify(); });
    this.input.on("submit", () => this.pick(this.choices()[this.at]));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
  }

  space() {
    return spaces().find((s) => s.id === props().space);
  }

  choices() {
    const space = this.space();
    if (!space) return [];
    const name = this.text.trim();
    const groups = groupsOn(load(), space.machine).filter((g) => g.name.toLowerCase().includes(name.toLowerCase()));
    return [...groups, ...(name && !groups.some((g) => sameName(g.name, name)) ? [{ name, fresh: true }] : [])];
  }

  pick(choice) {
    const space = this.space();
    if (!choice || !space) return;
    closeOverlay(props().overlay);
    assign(space.id, choice.fresh ? create(choice.name, space.machine) : choice.id);
  }

  render() {
    const t = theme();
    const space = this.space();
    const current = space && groupOf(load(), space);
    const list = this.choices();
    this.at = Math.min(this.at, Math.max(0, list.length - 1));
    const row = (c, i) => h_flex().id(`choice-${i}`).h(32).px(10).gap(9).items_center().rounded(7).cursor_pointer()
      .when(i === this.at, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .on_click(() => this.pick(c))
      .child(svg(`mods/simple-workspace/chrome/${c.fresh ? "folder-plus" : "folder"}.svg`).size(14).flex_none().text_color(t.muted))
      .child(div().flex_1().truncate().child(c.fresh ? `New group “${c.name}”` : c.name))
      .when(!c.fresh && c.id === current?.id, (el) => el.child(svg("mods/simple-workspace/chrome/check.svg").size(14).flex_none().text_color(t.dim)));
    const onKey = (e, cx) => {
      if (e.key === "escape") closeOverlay(props().overlay);
      else if (e.key === "down" && list.length) this.at = (this.at + 1) % list.length;
      else if (e.key === "up" && list.length) this.at = (this.at + list.length - 1) % list.length;
      else return;
      cx.stop_propagation();
      cx.notify();
    };
    return frame(t, space ? `Move ${space.name} to a group` : "Move to a group", this.handle, onKey,
      field(t, this.input),
      ...(list.length ? [v_flex().h(Math.min(260, list.length * 32)).flex_none().overflow_y_scrollbar().children(list.map(row))] : []));
  }
}

export class RenameDialog {
  init(_props, cx) {
    this.text = this.group()?.name ?? "";
    this.input = InputState.new({ value: this.text });
    if (this.text) this.input.set_selected_range({ start: 0, end: this.text.length });
    this.input.on("change", (_e, cx) => { this.text = this.input.value(); cx.notify(); });
    this.input.on("submit", () => this.save());
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
  }

  group() {
    return load().groups.find((g) => g.id === props().group);
  }

  valid() {
    const g = this.group();
    const name = this.text.trim();
    return Boolean(g && name) && !groupsOn(load(), g.machine).some((o) => o.id !== g.id && sameName(o.name, name));
  }

  save() {
    if (!this.valid()) return;
    closeOverlay(props().overlay);
    rename(props().group, this.text.trim());
  }

  render() {
    const t = theme();
    const ok = this.valid();
    const button = (id, text, primary, action) => h_flex().id(id).h(32).px(14).items_center().rounded(8)
      .border_1().border_color(primary ? t.solid : t.input).bg(primary ? t.solid : t.raised)
      .text_color(primary ? t.solid_foreground : t.foreground).text_size(12.5).font_medium()
      .when(primary && !ok, (el) => el.opacity(0.5))
      .when(!primary || ok, (el) => el.cursor_pointer().hover((s) => s.opacity(0.88)))
      .on_click(action).child(text);
    const onKey = (e, cx) => {
      if (e.key !== "escape") return;
      closeOverlay(props().overlay);
      cx.stop_propagation();
    };
    return frame(t, "Rename group", this.handle, onKey,
      field(t, this.input),
      h_flex().pt(6).gap(8).justify_end()
        .child(button("rename-cancel", "Cancel", false, () => closeOverlay(props().overlay)))
        .child(button("rename-save", "Save", true, () => this.save())));
  }
}
