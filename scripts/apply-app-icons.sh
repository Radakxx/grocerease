#!/usr/bin/env bash
# Resize the Grocerease logo into web favicons and Android launcher/splash assets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIGHT="$ROOT/src/assets/logo-light.png"
RES="$ROOT/android/app/src/main/res"

if [[ ! -f "$LIGHT" ]]; then
  echo "Missing $LIGHT" >&2
  exit 1
fi

resize() {
  local src="$1" dest="$2" w="$3" h="$4"
  mkdir -p "$(dirname "$dest")"
  sips -s format png -z "$h" "$w" "$src" --out "$dest" >/dev/null
}

# Source art already has padding; only add a little extra so round masks keep the leaf.
fit_round_icon() {
  local src="$1" dest="$2" size="$3"
  mkdir -p "$(dirname "$dest")"
  local inner=$((size * 90 / 100))
  local tmp
  tmp="$(mktemp -t grocerease-icon).png"
  sips -s format png -z "$inner" "$inner" "$src" --out "$tmp" >/dev/null
  sips -p "$size" "$size" --padColor E8E8E8 "$tmp" --out "$dest" >/dev/null
  rm -f "$tmp"
}

pad() {
  local src="$1" dest="$2" h="$3" w="$4" color="$5"
  mkdir -p "$(dirname "$dest")"
  local tmp
  tmp="$(mktemp -t grocerease-icon).png"
  # Fit the mark to ~40% of the shorter splash side, then pad to the canvas.
  local short=$((h < w ? h : w))
  local mark=$((short * 2 / 5))
  sips -s format png -z "$mark" "$mark" "$src" --out "$tmp" >/dev/null
  sips -p "$h" "$w" --padColor "$color" "$tmp" --out "$dest" >/dev/null
  rm -f "$tmp"
}

mkdir -p "$ROOT/resources"
sips -s format png -z 1024 1024 "$LIGHT" --out "$ROOT/resources/icon.png" >/dev/null

resize "$LIGHT" "$ROOT/public/assets/icon/icon.png" 512 512
resize "$LIGHT" "$ROOT/public/assets/icon/favicon.png" 64 64

for spec in mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432; do
  IFS=':' read -r name launch fg <<< "$spec"
  fit_round_icon "$LIGHT" "$RES/mipmap-$name/ic_launcher.png" "$launch"
  fit_round_icon "$LIGHT" "$RES/mipmap-$name/ic_launcher_round.png" "$launch"
  fit_round_icon "$LIGHT" "$RES/mipmap-$name/ic_launcher_foreground.png" "$fg"
done

# Splash (launch theme uses @drawable/splash)
pad "$LIGHT" "$RES/drawable/splash.png" 320 480 E8E8E8
pad "$LIGHT" "$RES/drawable-port-mdpi/splash.png" 480 320 E8E8E8
pad "$LIGHT" "$RES/drawable-port-hdpi/splash.png" 800 480 E8E8E8
pad "$LIGHT" "$RES/drawable-port-xhdpi/splash.png" 1280 720 E8E8E8
pad "$LIGHT" "$RES/drawable-port-xxhdpi/splash.png" 1600 960 E8E8E8
pad "$LIGHT" "$RES/drawable-port-xxxhdpi/splash.png" 1920 1280 E8E8E8
pad "$LIGHT" "$RES/drawable-land-mdpi/splash.png" 320 480 E8E8E8
pad "$LIGHT" "$RES/drawable-land-hdpi/splash.png" 480 800 E8E8E8
pad "$LIGHT" "$RES/drawable-land-xhdpi/splash.png" 720 1280 E8E8E8
pad "$LIGHT" "$RES/drawable-land-xxhdpi/splash.png" 960 1600 E8E8E8
pad "$LIGHT" "$RES/drawable-land-xxxhdpi/splash.png" 1280 1920 E8E8E8

echo "Applied Grocerease icons under public/assets/icon, resources/, and android/app/src/main/res"
