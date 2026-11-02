import { View } from "gpui-kit";
import { props } from "herdr";
import Changes from "./changes/main.js";
import Spaces from "./spaces/main.js";
import Agents from "./agents/main.js";
import Quota from "./quota/main.js";
const SECTIONS = { changes: Changes, spaces: Spaces, agents: Agents, quota: Quota };
export default class Workspace extends View {
  init(initial, cx) {
    const section = props()?.section ?? "changes";
    const Part = SECTIONS[section];
    if (!Part) throw new Error(`Unknown simple-workspace section: ${section}`);
    this.part = new Part();
    this.part.init(initial, cx);
  }
  render(cx) { return this.part.render(cx); }
  async close(cx) { await this.part?.close?.(cx); }
}
