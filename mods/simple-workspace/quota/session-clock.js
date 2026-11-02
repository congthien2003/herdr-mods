// Elapsed time of the local Herdr window process, independent of quota/machine.
import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { exec, theme } from "herdr";

// Fixed local PowerShell command. Never interpolate paths or user input.
const START_COMMAND = "$ErrorActionPreference = 'Stop'; $apps = @(Get-Process -Name 'herdr-app' | Where-Object { $_.MainWindowHandle -ne 0 }); if ($apps.Count -ne 1) { throw 'Cannot identify a unique Herdr window process' }; $apps[0].StartTime.ToUniversalTime().ToString('o')";

function duration(startedAt, now) {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  return [hours, minutes, seconds % 60].map(n => String(n).padStart(2, "0")).join(":");
}

export class SessionClock {
  init(cx) {
    this.startedAt = null;
    this.loading = false;
    this.error = null;
    this.resolve(cx);
    // Data clock, not an animation: elapsed time comes from the original timestamp.
    cx.timer.every(1000, cx => cx.notify());
    cx.timer.every(30000, cx => { if (this.startedAt === null) this.resolve(cx); });
  }

  resolve(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.spawn(async cx => {
      try {
        const result = await exec("pwsh", ["-NoProfile", "-NonInteractive", "-Command", START_COMMAND]);
        if (result.code !== 0) throw new Error(result.stderr?.trim() || "Cannot read Herdr start time");
        const startedAt = Date.parse(result.stdout.trim());
        if (!Number.isFinite(startedAt) || startedAt > Date.now()) throw new Error("Invalid Herdr start time");
        this.startedAt = startedAt;
        this.error = null;
      } catch (e) {
        this.error = String(e?.message ?? e);
      } finally {
        this.loading = false;
        cx.notify();
      }
    });
  }

  render() {
    const t = theme();
    return h_flex().id("app-session-clock").h_full().flex_none().px(10).gap(7).items_center()
      .bg(t.chrome).border_t(1).border_color(t.border).text_size(11).text_color(t.muted)
      .tooltip(this.error ? `App session time unavailable: ${this.error}` : "Time since Herdr opened (includes background and sleep)")
      .child(div().w(1).h(12).flex_none().bg(t.border))
      .child(svg("mods/simple-workspace/chrome/clock.svg").size(13).flex_none().text_color(t.dim))
      .child(div().min_w(58).font_family("JetBrains Mono").child(this.startedAt === null ? "--:--:--" : duration(this.startedAt, Date.now())));
  }
}
