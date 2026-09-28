import json
import os
import re
from pathlib import Path

import numpy as np
from manim import *


RENDER_SCALE = int(os.environ.get("GROOT_RENDER_SCALE", "2"))
TEXT_RENDER_SCALE = int(os.environ.get("GROOT_TEXT_RENDER_SCALE", "4"))
FRAME_RATE = int(os.environ.get("GROOT_FPS", "30"))


config.pixel_width = 1920 * RENDER_SCALE
config.pixel_height = 1080 * RENDER_SCALE
config.frame_width = 17.2
config.frame_height = 9.675
config.frame_rate = FRAME_RATE
config.background_color = "#FFFFFF"


FONT = "STIX Two Text"

INK = "#2A2420"  # axes, outlines, non-data lines
CAPTION_INK = "#1B1F24"
MUTED = "#5F6368"
GRID = "#E6E6E6"
BG = "#FFFFFF"
CARD = "#FFFFFF"
FILL = "#F4F4F4"

# Okabe-Ito colours from the paper's paper_style.py
BASE = "#999999"
IID = "#0072B2"
IID64 = "#56B4E9"
GROOT = "#D55E00"
VS = "#009E73"

# Full pass@k curves (k = 1..64) for hard ("frontier") problems, macro-averaged over
# LiveCodeBench and OJBench, read from the page's data file so the video and page agree.
PASSK_JS = Path(__file__).resolve().parents[2] / "assets/js/diversity/passk.js"


def load_curves():
    src = PASSK_JS.read_text()
    data = json.loads(re.search(r"window\.CD_PASSK\s*=\s*(\{.*\})\s*;?\s*$", src, re.S).group(1))
    return {arm: data["table2"][arm]["macro"] for arm in data["table2"]}


CURVES = load_curves()
KS = np.arange(1, 65)

# series key -> (curve arm, end-label text, colour, line style, marker)
# End-label numbers are the paper's rounded Table 2 values.
SERIES = {
    "base": ("Base", "5.2  base model", BASE, "dashed", "dot"),
    "iid4": ("IID-4", "5.2  IID, 4 samples", IID, "solid", "circle"),
    "iid64": ("IID-64 (T=1.5)", "7.9  IID, 64 samples", IID64, "solid", "hollow"),
    "groot": ("GROOT-4", "15.5  GROOT, 4 samples", GROOT, "solid", "square"),
    "vs": ("VS-4", "17.5  VS, 4 samples", VS, "solid", "triangle"),
    "groot_anti": ("GROOT-4 (ANTI)", "12.8  GROOT-4, all wrong", GROOT, "dotted", "hollow_square"),
    "vs_anti": ("VS-4 (ANTI)", "14.8  VS-4, all wrong", VS, "dotted", "hollow_triangle"),
}


def txt(text, size=26, color=INK, weight=NORMAL, t2c=None):
    # Invisible "|" struts give every label the same ascender/descender box,
    # so stacked lines and side-by-side labels share a baseline.
    render_size = max(size * TEXT_RENDER_SCALE, 48)
    mob = Text(
        f"|{text}|",
        font=FONT,
        font_size=render_size,
        color=color,
        weight=weight,
        t2c=t2c or {},
        disable_ligatures=True,
    )
    mob.scale(size / render_size)
    mob[0].set_opacity(0)
    mob[-1].set_opacity(0)
    return mob


def set_text_opacity(mob, opacity):
    mob.set_opacity(opacity)
    mob[0].set_opacity(0)
    mob[-1].set_opacity(0)
    return mob


def fit(mob, max_width):
    if mob.width > max_width:
        mob.scale(max_width / mob.width)
    return mob


def rect(width, height, fill=CARD, stroke=INK, stroke_width=1.8, radius=0.1):
    return RoundedRectangle(
        width=width,
        height=height,
        corner_radius=radius,
        fill_color=fill,
        fill_opacity=1,
        stroke_color=stroke,
        stroke_width=stroke_width,
    )


def bucket(center, width, height):
    x, y = center[0], center[1]
    fill = Rectangle(width=width, height=height, fill_color=FILL, fill_opacity=1, stroke_width=0).move_to([x, y, 0])
    line = VMobject()
    line.set_points_as_corners(
        [
            [x - width / 2, y + height / 2 + 0.08, 0],
            [x - width / 2, y - height / 2, 0],
            [x + width / 2, y - height / 2, 0],
            [x + width / 2, y + height / 2 + 0.08, 0],
        ]
    )
    line.set_stroke(INK, width=3)
    return VGroup(fill, line)


# ---------------------------------------------------------------- plot geometry
PX0, PW = -5.3, 8.4  # log2(k) 0..6 -> x in [PX0, PX0 + PW]
PY0, PH = -1.95, 5.0  # % solved 0..20 -> y in [PY0, PY0 + PH]


def X(k):
    return PX0 + np.log2(k) / 6 * PW


def Y(v):
    return PY0 + v / 20 * PH


def label_layout():
    """Final y for every end label: start at the curve's k=64 value, keep 0.5 apart."""
    order = sorted(SERIES, key=lambda s: -CURVES[SERIES[s][0]][-1])
    ys = {}
    prev = None
    for key in order:
        y = Y(CURVES[SERIES[key][0]][-1])
        if prev is not None and y > prev - 0.5:
            y = prev - 0.5
        ys[key] = y
        prev = y
    return ys


LABEL_Y = label_layout()


class GrootPipeline(Scene):
    def construct(self):
        self.camera.background_color = BG
        state = {"cap": None}

        def mark(name):
            print(f"BEAT {name} t={self.renderer.time:.2f}", flush=True)

        # ---------------------------------------------------------- captions
        def make_caption(text):
            lines = VGroup(*[txt(t, 34, CAPTION_INK, SEMIBOLD) for t in text.split("\n")])
            lines.arrange(DOWN, buff=0.04)
            for ln in lines:
                fit(ln, 15.8)
                ln.set_x(0)
            # Bottom-anchored like subtitles: the last line always sits at the same height.
            lines.shift(UP * (-4.28 - lines[-1].get_y()))
            return lines

        def caption(text, name=None):
            if name:
                mark(name)
            print(f"CAPTION t={self.renderer.time:.2f} {text!r}", flush=True)
            new = make_caption(text)
            if state["cap"] is not None:
                self.play(FadeOut(state["cap"]), run_time=0.2)
            self.play(FadeIn(new, shift=UP * 0.06), run_time=0.3)
            state["cap"] = new

        # ---------------------------------------------------------- plot parts
        def make_frame():
            title = txt("Frontier problems: LiveCodeBench + OJBench", 30, INK, BOLD).move_to([0, 4.3, 0])
            x_end = X(64) + 0.3
            x_axis = Line([PX0 - 0.25, PY0, 0], [x_end, PY0, 0], color=INK, stroke_width=2.4)
            y_axis = Line([PX0 - 0.25, PY0, 0], [PX0 - 0.25, Y(20) + 0.1, 0], color=INK, stroke_width=2.4)
            grid = VGroup(*[Line([PX0 - 0.25, Y(v), 0], [x_end, Y(v), 0], color=GRID, stroke_width=1.5) for v in [5, 10, 15, 20]])
            y_ticks = VGroup()
            for v in [0, 5, 10, 15, 20]:
                lab = txt(str(v), 24, MUTED)
                lab.move_to([PX0 - 0.45 - lab.width / 2, Y(v), 0])
                y_ticks.add(lab)
            x_ticks = VGroup()
            for k in [1, 2, 4, 8, 16, 32, 64]:
                tick = Line([X(k), PY0, 0], [X(k), PY0 - 0.1, 0], color=INK, stroke_width=2.4)
                lab = txt(str(k), 24, MUTED).move_to([X(k), PY0 - 0.36, 0])
                x_ticks.add(VGroup(tick, lab))
            x_title = txt("tries per problem (k)", 26, MUTED).move_to([X(8), PY0 - 0.82, 0])
            y_title = txt("% of problems solved", 26, MUTED)
            y_title.move_to([PX0 - 0.6 + y_title.width / 2, Y(20) + 0.5, 0])
            model = txt("Qwen3-4B-Instruct", 24, MUTED)
            model.move_to([x_end - model.width / 2, y_title.get_y(), 0])
            return title, VGroup(grid, x_axis, y_axis), VGroup(y_ticks, x_ticks, x_title, y_title, model)

        def marker(kind, p, color):
            if kind == "dot":
                return Dot(p, radius=0.06, color=color)
            if kind == "circle":
                return Dot(p, radius=0.08, color=color)
            if kind == "hollow":
                return Circle(radius=0.08, fill_color=WHITE, fill_opacity=1, stroke_color=color, stroke_width=3).move_to(p)
            if kind == "square":
                return Square(side_length=0.17, fill_color=color, fill_opacity=1, stroke_width=0).move_to(p)
            if kind == "hollow_square":
                return Square(side_length=0.16, fill_color=WHITE, fill_opacity=1, stroke_color=color, stroke_width=3).move_to(p)
            if kind == "triangle":
                return Triangle(fill_color=color, fill_opacity=1, stroke_width=0).scale(0.13).move_to(p)
            if kind == "hollow_triangle":
                return Triangle(fill_color=WHITE, fill_opacity=1, stroke_color=color, stroke_width=3).scale(0.12).move_to(p)
            raise ValueError(kind)

        def make_series(key):
            arm, label, color, style, kind = SERIES[key]
            vals = CURVES[arm]
            pts = [np.array([X(k), Y(v), 0]) for k, v in zip(KS, vals)]
            line = VMobject()
            line.set_points_smoothly(pts)
            line.set_stroke(color, width=5 if style == "solid" else 4.5)
            if style == "dashed":
                line = DashedVMobject(line, num_dashes=40, dashed_ratio=0.55)
            elif style == "dotted":
                line = DashedVMobject(line, num_dashes=70, dashed_ratio=0.35)
            marks = VGroup(*[marker(kind, pts[k - 1], color) for k in [1, 2, 4, 8, 16, 32, 64]])
            end = pts[-1]
            lab = txt(label, 26, color, BOLD)
            ly = LABEL_Y[key]
            lab.move_to([X(64) + 0.62 + lab.width / 2, ly, 0])
            leader = Line(end + RIGHT * 0.14, [X(64) + 0.5, ly, 0], color=color, stroke_width=1.8)
            return {"line": line, "marks": marks, "label": VGroup(leader, lab), "text": lab, "leader": leader}

        def draw_series(s, run_time=1.0):
            self.play(Create(s["line"]), run_time=run_time, rate_func=linear)
            self.play(
                LaggedStart(*[GrowFromCenter(m) for m in s["marks"]], lag_ratio=0.08),
                FadeIn(s["label"], shift=RIGHT * 0.08),
                run_time=0.45,
            )

        def dim_series(s, line_op=0.3, text_op=0.75):
            s["line"].set_stroke(opacity=line_op)
            s["marks"].set_opacity(line_op)
            s["leader"].set_stroke(opacity=line_op)
            set_text_opacity(s["text"], text_op)

        def series_group(s):
            return VGroup(s["line"], s["marks"], s["label"])

        # =================================================================
        # Beat 1: the problem
        # =================================================================
        caption("Self-training on a model's own answers\nbarely helps on hard problems.", "1_problem")
        title, frame, ticks = make_frame()
        self.play(FadeIn(title, shift=DOWN * 0.08), run_time=0.5)
        self.play(Create(frame[1]), Create(frame[2]), run_time=0.6)
        self.play(FadeIn(frame[0]), FadeIn(ticks), run_time=0.4)
        s_base = make_series("base")
        s_iid4 = make_series("iid4")
        s_iid64 = make_series("iid64")
        draw_series(s_base, 0.9)
        draw_series(s_iid4, 0.8)
        caption("Even with 64 samples per problem:\n5% → 8% solved at 64 tries.")
        draw_series(s_iid64, 0.9)
        self.wait(2.2)
        plot1 = VGroup(title, frame, ticks, *[series_group(s) for s in (s_base, s_iid4, s_iid64)])
        self.play(FadeOut(plot1), FadeOut(state["cap"]), run_time=0.5)
        state["cap"] = None

        # =================================================================
        # Beat 2: why, and the fix
        # =================================================================
        mark("2_why")
        why_title = txt("Better training data through strategic diversity", 30, INK, BOLD).move_to([0, 4.3, 0])
        self.play(FadeIn(why_title, shift=DOWN * 0.08), run_time=0.4)
        caption("Independent samples mostly repeat the same strategy.")
        DY = -0.55  # panel content sits below the beat title
        LX, RX = -5.0, 3.65
        divider = Line([-1.4, 3.65, 0], [-1.4, -3.05, 0], color=INK, stroke_width=1.6, stroke_opacity=0.35)
        h_iid = txt("Independent samples", 32, IID, BOLD).move_to([LX, 3.85 + DY, 0])
        h_groot = txt("Diverse strategies (GROOT)", 32, GROOT, BOLD).move_to([RX, 3.85 + DY, 0])

        prob_l = VGroup(rect(1.9, 0.62), txt("problem", 26, INK))
        prob_l[1].move_to(prob_l[0])
        prob_l.move_to([LX, 2.75 + DY, 0])
        spray = []
        for i in range(8):
            ang = PI + (i + 0.5) * PI / 8
            spray.append(np.array([LX + 2.3 * np.cos(ang), 2.55 + DY + 1.45 * np.sin(ang), 0]))
        dots_l = VGroup(*[Dot(prob_l.get_bottom(), radius=0.14, color=IID) for _ in range(8)])
        buck_l = bucket([LX, -1.05 + DY, 0], 3.2, 1.2)
        pile = [np.array([LX - 1.05 + (i % 4) * 0.7, -1.3 + DY + (i // 4) * 0.45, 0]) for i in range(8)]
        one = txt("one strategy", 30, IID, BOLD).move_to([LX, -2.2 + DY, 0])

        self.play(FadeIn(h_iid), Create(divider), FadeIn(prob_l), FadeIn(buck_l), run_time=0.5)
        self.play(LaggedStart(*[d.animate.move_to(p) for d, p in zip(dots_l, spray)], lag_ratio=0.05), run_time=0.7)
        self.play(LaggedStart(*[d.animate.move_to(p) for d, p in zip(dots_l, pile)], lag_ratio=0.05), run_time=0.8)
        self.play(FadeIn(one, shift=UP * 0.06), run_time=0.3)
        self.wait(0.6)

        caption("We ask the model for different strategies first,\nthen solve once per strategy.")
        prob_r = VGroup(rect(1.9, 0.62), txt("problem", 26, INK))
        prob_r[1].move_to(prob_r[0])
        prob_r.move_to([RX, 2.75 + DY, 0])
        cols = [0.2, 2.5, 4.8, 7.1]
        names = ["scan all", "2D ranges", "offline sweep", "binary search"]
        nodes, kids, e1, e2, bucks = [], [], [], [], []
        for x, name in zip(cols, names):
            n = VGroup(rect(2.1, 0.58), fit(txt(name, 24, INK), 1.95))
            n[1].move_to(n[0])
            n.move_to([x, 1.4 + DY, 0])
            k = Dot([x, 0.4 + DY, 0], radius=0.1, color=INK)
            nodes.append(n)
            kids.append(k)
            e1.append(Line(prob_r[0].get_bottom(), n[0].get_top(), color=INK, stroke_width=2.2))
            e2.append(Line(n[0].get_bottom(), k.get_center(), color=INK, stroke_width=2.2))
            bucks.append(bucket([x, -1.05 + DY, 0], 1.6, 1.2))
        four = txt("four strategies", 30, GROOT, BOLD).move_to([RX, -2.2 + DY, 0])

        self.play(FadeIn(h_groot), FadeIn(prob_r), LaggedStart(*[Create(e) for e in e1], lag_ratio=0.1), run_time=0.5)
        self.play(
            LaggedStart(*[FadeIn(n, shift=DOWN * 0.1) for n in nodes], lag_ratio=0.1),
            LaggedStart(*[Create(e) for e in e2], lag_ratio=0.1),
            LaggedStart(*[FadeIn(k) for k in kids], lag_ratio=0.1),
            FadeIn(VGroup(*bucks)),
            run_time=0.7,
        )
        sols = []
        for i in range(4):
            sol = Dot(kids[i].get_center(), radius=0.14, color=GROOT)
            self.play(
                e1[i].animate.set_stroke(GROOT, width=4.5),
                e2[i].animate.set_stroke(GROOT, width=4.5),
                nodes[i][0].animate.set_stroke(GROOT, width=3).set_fill(FILL),
                kids[i].animate.set_color(GROOT),
                run_time=0.25,
            )
            self.add(sol)
            self.play(sol.animate.move_to([cols[i], -1.3 + DY, 0]), run_time=0.25)
            sols.append(sol)
        self.play(FadeIn(four, shift=UP * 0.06), run_time=0.3)
        self.wait(1.2)
        why = VGroup(
            why_title, divider, h_iid, h_groot, prob_l, dots_l, buck_l, one, prob_r, *nodes, *kids, *e1, *e2, *bucks, *sols, four,
        )
        self.play(FadeOut(why), FadeOut(state["cap"]), run_time=0.5)
        state["cap"] = None

        # =================================================================
        # Beat 3: payoff
        # =================================================================
        caption("With just 4 diverse samples per problem,\nthe share solved at 64 tries triples: 5% → 16–18%.", "3_payoff")
        title, frame, ticks = make_frame()
        s_base = make_series("base")
        s_iid4 = make_series("iid4")
        s_iid64 = make_series("iid64")
        for s in (s_base, s_iid4, s_iid64):
            dim_series(s)
        self.play(
            FadeIn(VGroup(title, frame, ticks, *[series_group(s) for s in (s_base, s_iid4, s_iid64)])),
            run_time=0.7,
        )
        s_groot = make_series("groot")
        s_vs = make_series("vs")
        draw_series(s_groot, 1.1)
        draw_series(s_vs, 1.1)
        self.wait(2.2)

        # =================================================================
        # Beat 4: surprise (all-wrong training still wins)
        # =================================================================
        caption("Even when every diverse answer is wrong,\nit still beats training on correct IID answers.", "4_surprise")
        s_ga = make_series("groot_anti")
        s_va = make_series("vs_anti")
        draw_series(s_ga, 1.0)
        draw_series(s_va, 1.0)
        mark("poster")
        self.wait(2.6)

        # =================================================================
        # Beat 5: beats a much larger teacher (paper Table 3, held-out hard problems,
        # pass@64 at the 16k-token limit)
        # =================================================================
        plot3 = VGroup(title, frame, ticks, *[series_group(s) for s in (s_base, s_iid4, s_iid64, s_groot, s_vs, s_ga, s_va)])
        self.play(FadeOut(plot3), FadeOut(state["cap"]), run_time=0.5)
        state["cap"] = None
        caption("It even beats training on answers from a 60× larger teacher.", "5_teacher")

        TX0, TW = -2.4, 8.4  # 0..25 -> x in [TX0, TX0 + TW]

        def TXv(v):
            return TX0 + v / 25 * TW

        t_title = txt("% of problems solved at 64 tries", 30, INK, BOLD).move_to([0, 3.55, 0])
        t_model = txt("Qwen3-4B-Instruct student", 24, MUTED).move_to([0, 3.0, 0])
        axis_y = -1.45
        t_axis = Line([TXv(0), axis_y, 0], [TXv(25), axis_y, 0], color=INK, stroke_width=2.4)
        t_ticks = VGroup()
        for v in [0, 5, 10, 15, 20, 25]:
            t_ticks.add(Line([TXv(v), axis_y, 0], [TXv(v), axis_y - 0.1, 0], color=INK, stroke_width=2.4))
            t_ticks.add(txt(str(v), 24, MUTED).move_to([TXv(v), axis_y - 0.38, 0]))
        t_base = Line([TXv(0), axis_y, 0], [TXv(0), 2.65, 0], color=INK, stroke_width=2.4)
        rows = [
            ("235B teacher, IID", 13.4, IID, "hollow", 2.1),
            ("Own GROOT answers (4B)", 20.1, GROOT, "square", 0.95),
            ("Own VS answers (4B)", 22.8, VS, "triangle", -0.2),
        ]
        self.play(FadeIn(t_title, shift=DOWN * 0.08), FadeIn(t_model), Create(t_axis), Create(t_base), FadeIn(t_ticks), run_time=0.6)
        row_mobs = []
        for name, val, color, kind, y in rows:
            lab = txt(name, 28, color, BOLD)
            lab.move_to([TXv(0) - 0.4 - lab.width / 2, y, 0])
            baseline = kind == "hollow"  # the teacher row reads as the baseline: light fill, blue outline
            bar = Rectangle(
                width=TXv(val) - TXv(0),
                height=0.72,
                fill_color=color,
                fill_opacity=0.3 if baseline else 1,
                stroke_color=color,
                stroke_width=2.5 if baseline else 0,
            )
            bar.move_to([(TXv(0) + TXv(val)) / 2, y, 0])
            num = txt(f"{val}", 28, color, BOLD)
            num.move_to([TXv(val) + 0.25 + num.width / 2, y, 0])
            self.play(FadeIn(lab, shift=RIGHT * 0.08), GrowFromEdge(bar, LEFT), run_time=0.55)
            self.play(FadeIn(num, shift=RIGHT * 0.06), run_time=0.3)
            row_mobs.append(VGroup(lab, bar, num))
        self.wait(2.3)

        # =================================================================
        # Beat 6: end card
        # =================================================================
        mark("6_end")
        teacher = VGroup(t_title, t_model, t_axis, t_base, t_ticks, *row_mobs)
        self.play(FadeOut(teacher), FadeOut(state["cap"]), run_time=0.6)
        state["cap"] = None
        end_title = txt("Strategically Diverse Sampling for Self-Training", 44, INK, BOLD).move_to([0, 0.55, 0])
        fit(end_title, 15.5)
        takeaway = txt(
            "Diversity in approaches matters more than correctness.",
            34,
            CAPTION_INK,
            SEMIBOLD,
            t2c={"Diversity in approaches": GROOT},
        ).move_to([0, -0.45, 0])
        fit(takeaway, 15.5)
        self.play(FadeIn(end_title, shift=UP * 0.08), run_time=0.6)
        self.play(FadeIn(takeaway, shift=UP * 0.06), run_time=0.5)
        self.wait(2.8)
        mark("end")
