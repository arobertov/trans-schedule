"""
diagram_generator.py — Generates a Gantt-chart style shift diagram.

Produces a PNG file showing all routes on the Y-axis and time on the X-axis.
Each route row shows colored shift blocks with shift labels and station stop
labels above the bars.

Color coding:
  Morning (С) shifts: shades of green/lime
  Day     (Д) shifts: shades of orange/yellow/brown
  Night   (Н) shifts: shades of red/pink/dark

Usage:
    from diagram_generator import generate_diagram
    generate_diagram(shifts, output_path="output/shift_diagram.png")
"""

from __future__ import annotations

import os
from datetime import timedelta
from typing import Dict, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")  # non-interactive backend for file output
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

from shift_scheduler import Shift, MORNING, DAY, NIGHT
from block_generator import DrivingBlock
from schedule_parser import RouteSegment


# ─────────────────────────────────────────────────────────────────────────────
# Color palettes per shift type
# ─────────────────────────────────────────────────────────────────────────────

_MORNING_COLORS = [
    "#4CAF50",  # green
    "#8BC34A",  # light green
    "#CDDC39",  # lime
    "#66BB6A",  # medium green
    "#A5D6A7",  # pale green
    "#558B2F",  # dark green
    "#9CCC65",  # light lime
    "#1B5E20",  # very dark green
    "#76FF03",  # bright lime
    "#69F0AE",  # mint green
    "#00C853",  # emerald
    "#B9F6CA",  # very pale green
    "#33691E",  # olive green
    "#7CB342",  # apple green
    "#F9A825",  # amber (extra if needed)
]

_DAY_COLORS = [
    "#FF9800",  # orange
    "#FFC107",  # amber
    "#FF5722",  # deep orange
    "#FFCA28",  # yellow-amber
    "#FF7043",  # deep orange light
    "#F57C00",  # dark orange
    "#FFB300",  # amber darker
    "#E65100",  # burnt orange
    "#FFCC02",  # gold
    "#BF360C",  # brown-orange
    "#FF6D00",  # vivid orange
    "#FF8F00",  # amber deep
    "#D84315",  # deep burnt orange
    "#FFAB40",  # light orange
    "#FF6E40",  # coral orange
    "#FFA000",  # darker amber
]

_NIGHT_COLORS = [
    "#F44336",  # red
    "#E91E63",  # pink
    "#9C27B0",  # purple-red
    "#C62828",  # dark red
    "#AD1457",  # dark pink
    "#880E4F",  # maroon
    "#B71C1C",  # very dark red
    "#FF1744",  # bright red
    "#D81B60",  # hot pink
    "#6A1B9A",  # dark purple
    "#E53935",  # medium red
    "#EC407A",  # pink
    "#AB47BC",  # medium purple
    "#EF9A9A",  # pale red
    "#F48FB1",  # pale pink
]


def _td_to_hours(td: timedelta) -> float:
    """Convert timedelta to fractional hours."""
    return td.total_seconds() / 3600.0


def _td_to_str(td: timedelta) -> str:
    """Format timedelta as H:MM (wrapping at 24h)."""
    total = int(td.total_seconds())
    h = (total // 3600) % 24
    m = (total % 3600) // 60
    return f"{h}:{m:02d}"


# ─────────────────────────────────────────────────────────────────────────────
# Route display mapping
# ─────────────────────────────────────────────────────────────────────────────

# The Y-axis row labels and the route_ids that map to each row
_ROUTE_DISPLAY_ORDER = [
    "100",
    "101",    # maps to 101-morning
    "102",    # maps to 102-morning
    "103",
    "104",
    "105",
    "106",
    "107",
    "108",
    "109",
    "110",
    "114",    # maps to 101-evening
    "116",    # maps to 102-evening
]

_DISPLAY_TO_ROUTE_IDS = {
    "100": ["100"],
    "101": ["101-morning"],
    "102": ["102-morning"],
    "103": ["103"],
    "104": ["104"],
    "105": ["105"],
    "106": ["106"],
    "107": ["107"],
    "108": ["108"],
    "109": ["109"],
    "110": ["110"],
    "114": ["101-evening"],
    "116": ["102-evening"],
}


# ─────────────────────────────────────────────────────────────────────────────
# Color assignment per shift
# ─────────────────────────────────────────────────────────────────────────────

def _assign_shift_colors(shifts: List[Shift]) -> Dict[str, str]:
    """Assign a unique color to each shift, consistent by shift type."""
    color_map: Dict[str, str] = {}
    morning_idx = 0
    day_idx = 0
    night_idx = 0

    for shift in sorted(shifts, key=lambda s: (s.shift_type, s.start_time())):
        if shift.shift_id in color_map:
            continue
        if shift.shift_type == MORNING:
            color_map[shift.shift_id] = _MORNING_COLORS[morning_idx % len(_MORNING_COLORS)]
            morning_idx += 1
        elif shift.shift_type == DAY:
            color_map[shift.shift_id] = _DAY_COLORS[day_idx % len(_DAY_COLORS)]
            day_idx += 1
        else:  # NIGHT
            color_map[shift.shift_id] = _NIGHT_COLORS[night_idx % len(_NIGHT_COLORS)]
            night_idx += 1

    return color_map


# ─────────────────────────────────────────────────────────────────────────────
# Build per-route block data with shift info
# ─────────────────────────────────────────────────────────────────────────────

def _build_route_blocks(
    shifts: List[Shift],
) -> Dict[str, List[Tuple[DrivingBlock, Shift]]]:
    """
    Returns a mapping: route_display_name -> sorted list of (block, shift).
    """
    # Collect all (block, shift) pairs
    all_pairs: List[Tuple[DrivingBlock, Shift]] = []
    for shift in shifts:
        for entry in shift.entries:
            all_pairs.append((entry.block, shift))

    # Group by display route name
    result: Dict[str, List[Tuple[DrivingBlock, Shift]]] = {
        name: [] for name in _ROUTE_DISPLAY_ORDER
    }

    for block, shift in all_pairs:
        rid = block.route_id
        for display_name, route_ids in _DISPLAY_TO_ROUTE_IDS.items():
            if rid in route_ids:
                result[display_name].append((block, shift))
                break

    # Sort each route's blocks by board_time
    for name in result:
        result[name].sort(key=lambda p: p[0].board_time)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Station stop data per route for labels above bars
# ─────────────────────────────────────────────────────────────────────────────

def _build_route_stops(
    segments: List[RouteSegment],
) -> Dict[str, List[Tuple[str, timedelta]]]:
    """Returns display_name -> list of (station, time) for key stops."""
    result: Dict[str, List[Tuple[str, timedelta]]] = {}

    for seg in segments:
        # Map route_id to display name
        display_name = None
        for dn, rids in _DISPLAY_TO_ROUTE_IDS.items():
            if seg.route_id in rids:
                display_name = dn
                break
        if display_name is None:
            continue

        # Collect stops: only station-14 stops + first + last stop
        stops: List[Tuple[str, timedelta]] = []
        for i, stop in enumerate(seg.stops):
            if i == 0 or i == len(seg.stops) - 1 or stop.is_station14():
                stops.append((stop.station, stop.time))

        if display_name not in result:
            result[display_name] = stops
        else:
            # Merge (e.g., not needed here since each display maps to one segment)
            result[display_name].extend(stops)

    return result


# Minimum horizontal distance (in hours) between adjacent stop labels to avoid overlap
_MIN_LABEL_SPACING_HOURS = 0.3

# ─────────────────────────────────────────────────────────────────────────────
# Main diagram drawing
# ─────────────────────────────────────────────────────────────────────────────


def generate_diagram(
    shifts: List[Shift],
    segments: Optional[List[RouteSegment]] = None,
    output_path: str = "output/shift_diagram.png",
    show: bool = False,
) -> None:
    """
    Generate and save a Gantt-chart style shift diagram.

    Args:
        shifts: List of Shift objects from shift_scheduler.
        segments: List of RouteSegment objects for stop labels (optional).
        output_path: Where to save the PNG file.
        show: If True, call plt.show() after saving.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    color_map = _assign_shift_colors(shifts)
    route_blocks = _build_route_blocks(shifts)
    route_stops = _build_route_stops(segments) if segments else {}

    n_routes = len(_ROUTE_DISPLAY_ORDER)

    # Time range: panel 1 = 4:00–15:00, panel 2 = 15:00–25:00 (1:00 next day)
    PANEL1_START = 4.0   # hours
    PANEL1_END   = 15.0
    PANEL2_START = 15.0
    PANEL2_END   = 25.0  # 1:00 AM next day

    panel1_span = PANEL1_END - PANEL1_START
    panel2_span = PANEL2_END - PANEL2_START

    # Figure: two subplots side by side, width ratio proportional to time span
    fig, (ax1, ax2) = plt.subplots(
        1, 2,
        figsize=(28, max(10, n_routes * 0.85 + 2)),
        gridspec_kw={"width_ratios": [panel1_span, panel2_span]},
    )
    fig.patch.set_facecolor("#F5F5F5")

    # Row height and spacing
    row_height = 0.6
    row_spacing = 1.0  # center-to-center distance

    def _draw_panel(ax: plt.Axes, t_start: float, t_end: float) -> None:
        ax.set_xlim(t_start, t_end)
        ax.set_ylim(-0.5, n_routes * row_spacing - 0.5)
        ax.set_facecolor("#FAFAFA")

        # Hour grid lines
        for h in range(int(t_start), int(t_end) + 1):
            ax.axvline(h, color="#CCCCCC", linewidth=0.5, zorder=0)

        # X-axis ticks (hours, wrapped mod 24)
        tick_positions = [h for h in range(int(t_start), int(t_end) + 1)]
        tick_labels = [f"{h % 24}:00" for h in tick_positions]
        ax.set_xticks(tick_positions)
        ax.set_xticklabels(tick_labels, fontsize=7, rotation=45, ha="right")
        ax.tick_params(axis="x", which="both", bottom=True, top=True,
                       labeltop=True, labelbottom=False)
        ax.xaxis.set_ticks_position("top")

        # Y-axis: route labels
        ax.set_yticks([i * row_spacing for i in range(n_routes)])
        ax.set_yticklabels(_ROUTE_DISPLAY_ORDER, fontsize=9, fontweight="bold")
        ax.tick_params(axis="y", left=True, right=False, length=0)
        ax.invert_yaxis()

        # Horizontal separator lines between routes
        for i in range(n_routes + 1):
            ax.axhline(i * row_spacing - 0.5, color="#DDDDDD", linewidth=0.5, zorder=0)

        # Draw blocks for each route
        for row_idx, display_name in enumerate(_ROUTE_DISPLAY_ORDER):
            y_center = row_idx * row_spacing
            y_bar_bottom = y_center - row_height / 2
            blocks = route_blocks.get(display_name, [])

            # Draw stop labels (above bars) for stops in this time range
            stops = route_stops.get(display_name, [])
            prev_label_x = -999.0
            for station, stop_time in stops:
                x = _td_to_hours(stop_time)
                if x < t_start or x > t_end:
                    continue
                label = f"{station}\n{_td_to_str(stop_time)}"
                # Avoid overlapping labels
                if x - prev_label_x > _MIN_LABEL_SPACING_HOURS:
                    ax.text(
                        x, y_center - row_height / 2 - 0.05,
                        label,
                        fontsize=5,
                        ha="center", va="bottom",
                        color="#333333",
                        clip_on=True,
                    )
                    prev_label_x = x

            # Draw shift bars
            for block, shift in blocks:
                board_h = _td_to_hours(block.board_time)
                alight_h = _td_to_hours(block.alight_time)

                # Clip to panel bounds
                if alight_h <= t_start or board_h >= t_end:
                    continue
                bar_start = max(board_h, t_start)
                bar_end = min(alight_h, t_end)
                bar_width = bar_end - bar_start

                if bar_width <= 0:
                    continue

                color = color_map.get(shift.shift_id, "#AAAAAA")

                rect = mpatches.FancyBboxPatch(
                    (bar_start, y_bar_bottom),
                    bar_width,
                    row_height,
                    boxstyle="square,pad=0",
                    facecolor=color,
                    edgecolor="#555555",
                    linewidth=0.4,
                    zorder=2,
                    clip_on=True,
                )
                ax.add_patch(rect)

                # Shift label inside bar
                label_x = (bar_start + bar_end) / 2
                label_y = y_center

                # Perceived brightness using ITU-R BT.601 luma coefficients (range 0–255)
                r, g, b = _hex_to_rgb(color)
                brightness = (r * 299 + g * 587 + b * 114) / 1000
                text_color = "#111111" if brightness > 128 else "#FFFFFF"

                ax.text(
                    label_x, label_y,
                    shift.shift_id,
                    fontsize=5.5,
                    ha="center", va="center",
                    color=text_color,
                    fontweight="bold",
                    clip_on=True,
                    zorder=3,
                )

        # Borders
        for spine in ax.spines.values():
            spine.set_edgecolor("#AAAAAA")
            spine.set_linewidth(0.8)

    _draw_panel(ax1, PANEL1_START, PANEL1_END)
    _draw_panel(ax2, PANEL2_START, PANEL2_END)

    # Titles
    ax1.set_title("4:00 – 15:00", fontsize=10, fontweight="bold", pad=18)
    ax2.set_title("15:00 – 1:00 (next day)", fontsize=10, fontweight="bold", pad=18)

    # Remove y-axis labels from right panel (shared with left)
    ax2.set_yticklabels([])
    ax2.tick_params(axis="y", left=False)

    # Legend for shift types
    legend_handles = [
        mpatches.Patch(color=_MORNING_COLORS[0], label="Morning shift (С)"),
        mpatches.Patch(color=_DAY_COLORS[0], label="Day shift (Д)"),
        mpatches.Patch(color=_NIGHT_COLORS[0], label="Night shift (Н)"),
    ]
    fig.legend(
        handles=legend_handles,
        loc="lower center",
        ncol=3,
        fontsize=9,
        framealpha=0.8,
        bbox_to_anchor=(0.5, 0.01),
    )

    fig.suptitle(
        "Transit Shift Schedule — Route Coverage Diagram",
        fontsize=13,
        fontweight="bold",
        y=0.98,
    )

    plt.tight_layout(rect=[0, 0.04, 1, 0.96])
    plt.subplots_adjust(wspace=0.04)

    fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    print(f"Diagram saved to: {output_path}")

    if show:
        plt.show()

    plt.close(fig)


def _hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color string to (r, g, b) tuple (0–255)."""
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
    )
