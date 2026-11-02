import { openOverlay as nativeOpenOverlay } from "herdr";
export function openOverlay(options) {
  return nativeOpenOverlay(options.mod === "simple-workspace"
    ? { ...options, props: { ...options.props, section: "quota" } }
    : options);
}
