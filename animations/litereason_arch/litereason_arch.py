import os

from manim import *


RENDER_SCALE = int(os.environ.get("LITEREASON_RENDER_SCALE", "4"))
TEXT_RENDER_SCALE = int(os.environ.get("LITEREASON_TEXT_RENDER_SCALE", "6"))


config.pixel_width = 1920 * RENDER_SCALE
config.pixel_height = 1080 * RENDER_SCALE
config.frame_width = 17.2
config.frame_height = 9.675
config.frame_rate = 60
config.background_color = "#FBFCFE"


FONT = "Noto Sans"


class LiteReasonArchitecture(Scene):
    def construct(self):
        self.camera.background_color = "#FBFCFE"

        c = {
            "bg": "#FBFCFE",
            "ink": "#1F2937",
            "muted": "#667085",
            "line": "#AAB5C2",
            "line_soft": "#DEE5EE",
            "guide": "#C7D0DD",
            "lm": "#8EA3BD",
            "lm_dark": "#627893",
            "lm_lit": "#D8E7F7",
            "flow": "#6F879F",
            "flow_latent": "#C96881",
            "flow_answer": "#3BA776",
            "band": "#D9E7F5",
            "band_latent": "#F7C7D2",
            "hidden": "#DDD2EE",
            "hidden_dark": "#A992CF",
            "discrete": "#F6D466",
            "discrete_dark": "#C3A43C",
            "latent": "#F19AB0",
            "latent_dark": "#C96881",
            "proj": "#E68080",
            "proj_dark": "#C65656",
            "answer": "#EAF7F0",
            "answer_dark": "#3BA776",
            "white": "#FFFFFF",
            "caption": "#344054",
        }

        def txt(text, size=24, color=None, weight=NORMAL, align="center"):
            render_size = max(size * TEXT_RENDER_SCALE, 48)
            mob = Text(
                text,
                font=FONT,
                font_size=render_size,
                color=color or c["ink"],
                weight=weight,
                should_center=True,
                t2c={},
            )
            if render_size != size:
                mob.scale(size / render_size)
            return mob

        def subscript_label(base, index, size=20, color=None, weight=MEDIUM):
            base_mob = txt(base, size=size, color=color or c["ink"], weight=weight)
            sub_mob = txt(index, size=size * 0.52, color=color or c["ink"], weight=weight)
            sub_mob.next_to(base_mob, RIGHT, buff=0.012)
            sub_mob.align_to(base_mob, DOWN)
            sub_mob.shift(DOWN * 0.06)
            return VGroup(base_mob, sub_mob)

        def symbol_label(text, size=20, color=None, weight=MEDIUM):
            if isinstance(text, Mobject):
                return text
            if (
                isinstance(text, str)
                and len(text) >= 2
                and text[0] in {"x", "e", "h", "a"}
                and text[1:].isdigit()
            ):
                return subscript_label(text[0], text[1:], size=size, color=color or c["ink"], weight=weight)
            return txt(text, size=size, color=color or c["ink"], weight=weight)

        def sub(text):
            return text.translate(str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉"))

        def fit_text(mob, max_width):
            if mob.width > max_width:
                mob.scale(max_width / mob.width)
            return mob

        def letter_line(text, size=20, color=None, weight=MEDIUM, buff=0.012):
            pieces = VGroup()
            for ch in text:
                if ch == " ":
                    spacer = Rectangle(
                        width=size * 0.006,
                        height=size * 0.002,
                        stroke_width=0,
                        fill_opacity=0,
                    )
                    pieces.add(spacer)
                else:
                    pieces.add(txt(ch, size=size, color=color or c["ink"], weight=weight))
            pieces.arrange(RIGHT, buff=buff)
            return pieces

        def clean_label(text, size=20, color=None, weight=MEDIUM):
            label = VGroup(
                *[
                    letter_line(line, size=size, color=color or c["ink"], weight=weight)
                    for line in text.split("\n")
                ]
            )
            label.arrange(DOWN, buff=0.02)
            return label

        def box(
            label,
            width,
            height,
            fill,
            stroke,
            label_color=None,
            size=20,
            weight=MEDIUM,
            radius=0.06,
            clean_text=False,
        ):
            rect = RoundedRectangle(
                width=width,
                height=height,
                corner_radius=radius,
                fill_color=fill,
                fill_opacity=1,
                stroke_color=stroke,
                stroke_width=1.4,
            )
            has_label = label is not None and not (isinstance(label, str) and label == "")
            if has_label:
                if isinstance(label, Mobject):
                    label_mob = label
                elif clean_text:
                    label_mob = clean_label(label, size=size, color=label_color or c["ink"], weight=weight)
                    fit_text(label_mob, width - 0.12)
                    if label_mob.height > height - 0.1:
                        label_mob.scale((height - 0.1) / label_mob.height)
                elif isinstance(label, str) and "\n" in label:
                    label_mob = VGroup(
                        *[
                            txt(line, size=size, color=label_color or c["ink"], weight=weight)
                            for line in label.split("\n")
                        ]
                    )
                    label_mob.arrange(DOWN, buff=0.01)
                    fit_text(label_mob, width - 0.12)
                    if label_mob.height > height - 0.1:
                        label_mob.scale((height - 0.1) / label_mob.height)
                else:
                    label_mob = symbol_label(label, size=size, color=label_color or c["ink"], weight=weight)
                    fit_text(label_mob, width - 0.12)
                label_mob.move_to(rect)
            else:
                label_mob = VGroup()
            rect.set_z_index(1)
            label_mob.set_z_index(2)
            return VGroup(rect, label_mob)

        def line_path(points, color=None, width=2, opacity=1):
            mob = VMobject()
            mob.set_points_as_corners([np.array([x, y, 0]) for x, y in points])
            mob.set_stroke(color or c["line"], width=width, opacity=opacity)
            return mob

        caption_size = 28
        caption_max_width = 16.2

        def outline_rect(mob, color, buff=0.075, stroke_width=3.2, opacity=0.9):
            target = mob
            if isinstance(mob, VGroup) and len(mob) > 0 and isinstance(mob[0], (Rectangle, RoundedRectangle)):
                target = mob[0]
            rect = RoundedRectangle(
                width=target.width + 2 * buff,
                height=target.height + 2 * buff,
                corner_radius=0.095,
                fill_opacity=0,
                stroke_color=color,
                stroke_width=stroke_width,
            )
            rect.move_to(target.get_center())
            rect.set_stroke(opacity=opacity)
            rect.set_z_index(5)
            return rect

        def normal(text):
            return (text, c["caption"], NORMAL)

        def key(text, color):
            return (text, color, BOLD)

        def caption_line(spans):
            parts = []
            t2c = {}
            t2w = {}
            for item in spans:
                if isinstance(item, str):
                    text, color, weight = item, c["caption"], NORMAL
                else:
                    text = item[0]
                    color = item[1] if len(item) > 1 and item[1] is not None else c["caption"]
                    weight = item[2] if len(item) > 2 else NORMAL
                parts.append(text)
                if color != c["caption"]:
                    t2c[text] = color
                if weight != NORMAL:
                    t2w[text] = weight

            render_size = max(caption_size * TEXT_RENDER_SCALE, 48)
            line = Text(
                " ".join(parts),
                font=FONT,
                font_size=render_size,
                color=c["caption"],
                weight=NORMAL,
                should_center=True,
                t2c=t2c,
                t2w=t2w,
                disable_ligatures=True,
            )
            if render_size != caption_size:
                line.scale(caption_size / render_size)
            fit_text(line, caption_max_width)
            return line

        def caption(content, highlights=None):
            rule = Line([-0.66, -3.2, 0], [0.66, -3.2, 0], color="#C9D2DD", stroke_width=1.3)
            if isinstance(content, str):
                line_specs = [[normal(line)] for line in content.split("\n")]
            elif content and all(isinstance(item, (str, tuple)) for item in content):
                line_specs = [content]
            else:
                line_specs = content
            lines = VGroup(*[caption_line(line) for line in line_specs])
            lines.arrange(DOWN, buff=0.1)
            for line in lines:
                line.set_x(0)
            label = lines
            label.next_to(rule, DOWN, buff=0.17)
            label.set_x(0)
            callouts = VGroup()
            for mob, color in highlights or []:
                callouts.add(outline_rect(mob, color))
            rule.set_z_index(5)
            label.set_z_index(6)
            return VGroup(rule, label, callouts)

        title = txt("Generation with LiteReason", 32, c["ink"], BOLD)
        title.move_to([0, 4.05, 0])

        x_start = -5.85
        x_step = 0.975
        xs = [x_start + i * x_step for i in range(13)]

        y_output = 2.72
        y_head = 1.48
        y_hidden = 0.38
        y_lm = -0.52
        y_input = -1.43
        y_token = -2.12

        input_w = 0.64
        input_h = 0.52
        hidden_w = 0.64
        hidden_h = 0.48
        output_w = 0.64
        output_h = 0.52
        lm_h = 0.64
        module_h = 0.78
        module_pad = 0.68

        # Row labels and guide ticks, matching the original paper figure.
        left_x = -6.5
        dash_end = -5.92
        row_labels = VGroup()
        label_specs = [
            ("output token /\nembedding", y_output),
            ("head / projector", y_head),
            ("last hidden state", y_hidden),
            ("input embedding", y_input),
            ("input token", y_token),
        ]
        for text, y in label_specs:
            lab = VGroup(
                *[
                    txt(line, 18, c["muted"], NORMAL, align="right")
                    for line in text.split("\n")
                ]
            )
            lab.arrange(DOWN, buff=0.015)
            lab.move_to([left_x, y, 0])
            lab.align_to([left_x, y, 0], RIGHT)
            guide = DashedLine(
                [left_x + 0.14, y, 0],
                [dash_end, y, 0],
                dash_length=0.08,
                dashed_ratio=0.5,
                color=c["guide"],
                stroke_width=1,
            )
            row_labels.add(lab, guide)

        col_guides = VGroup()
        for x in xs:
            col_guides.add(
                Line([x, y_input + 0.38, 0], [x, y_output - 0.38, 0], color=c["line_soft"], stroke_width=1)
            )

        token_labels = ["x0", "x1", "<bot>", "", "", "x2", "<bot>", "", "", "", "a1", "a2", "a3"]
        input_kinds = [
            "discrete",
            "discrete",
            "discrete",
            "latent",
            "latent",
            "discrete",
            "discrete",
            "latent",
            "latent",
            "latent",
            "answer",
            "answer",
            "answer",
        ]
        input_labels = ["", "", "", "e0", "e1", "", "", "e2", "e3", "e4", "", "", ""]

        input_boxes = []
        input_strokes = []
        bottom_labels = VGroup()
        for i, x in enumerate(xs):
            if input_kinds[i] == "latent":
                fill = c["latent"]
                stroke = c["latent_dark"]
            elif input_kinds[i] == "answer":
                fill = c["answer"]
                stroke = c["answer_dark"]
            else:
                fill = c["discrete"]
                stroke = c["discrete_dark"]
            input_strokes.append(stroke)
            b = box(input_labels[i], input_w, input_h, fill, stroke, c["ink"], 20, BOLD)
            b.move_to([x, y_input, 0])
            b[0].set_fill(opacity=0.22)
            b[0].set_stroke(opacity=0.28)
            b[1].set_opacity(0.32)
            input_boxes.append(b)
            if token_labels[i]:
                label = symbol_label(token_labels[i], 20, c["ink"], NORMAL).move_to([x, y_token, 0])
                fit_text(label, 0.86)
                if i != 0:
                    label.set_opacity(0.34)
                bottom_labels.add(label)

        input_boxes[0][0].set_fill(opacity=1)
        input_boxes[0][0].set_stroke(opacity=1)

        lm_width = xs[-1] - xs[0] + 0.92
        lm = box("Language Model", lm_width, lm_h, c["lm"], c["lm_dark"], c["white"], 30, BOLD, radius=0.07)
        lm.move_to([(xs[0] + xs[-1]) / 2, y_lm, 0])

        hidden_labels = ["", "", "h0", "h1", "", "", "h2", "h3", "h4", "", "", "", ""]
        hidden_boxes = []
        for i, x in enumerate(xs):
            h = box(hidden_labels[i], hidden_w, hidden_h, c["hidden"], c["hidden_dark"], c["ink"], 20, BOLD)
            h.move_to([x, y_hidden, 0])
            h[0].set_fill(opacity=0.28)
            h[0].set_stroke(opacity=0.36)
            h[1].set_opacity(0.42)
            hidden_boxes.append(h)

        modules = []
        module_strokes = []
        module_specs = [
            ("LM Head", 0, 1, c["lm"], c["lm_dark"]),
            ("Reasoning\nProjector", 2, 3, c["proj"], c["proj_dark"]),
            ("LM Head", 4, 5, c["lm"], c["lm_dark"]),
            ("Reasoning\nProjector", 6, 8, c["proj"], c["proj_dark"]),
            ("LM Head", 9, 12, c["lm"], c["lm_dark"]),
        ]
        module_groups = VGroup()
        for label, a, b, fill, stroke in module_specs:
            width = (xs[b] - xs[a]) + module_pad
            module_size = 19 if "\n" in label else 21
            m = box(label, width, module_h, fill, stroke, c["white"], module_size, BOLD, radius=0.07)
            m.move_to([(xs[a] + xs[b]) / 2, y_head, 0])
            modules.append(m)
            module_strokes.append(stroke)
            module_groups.add(m)

        col_to_module = [0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 4]
        col_is_latent = [False, False, True, True, False, False, True, True, True, False, False, False, False]

        output_labels = [
            ("x1", "text"),
            ("<bot>", "text"),
            ("e0", "latent"),
            ("e1", "latent"),
            ("x2", "text"),
            ("<bot>", "text"),
            ("e2", "latent"),
            ("e3", "latent"),
            ("e4", "latent"),
            ("a1", "answer"),
            ("a2", "answer"),
            ("a3", "answer"),
            ("a4", "answer"),
        ]
        outputs = []
        for i, (label, kind) in enumerate(output_labels):
            if kind == "latent":
                out = box(label, output_w, output_h, c["latent"], c["latent_dark"], c["ink"], 20, BOLD)
            elif kind == "answer":
                out = box(label, output_w, output_h, c["answer"], c["answer_dark"], c["ink"], 20, BOLD)
            else:
                out = symbol_label(label, 20, c["ink"], NORMAL)
                fit_text(out, 0.86)
            out.move_to([xs[i], y_output, 0])
            out.set_opacity(0.28)
            outputs.append(out)
        answer_outputs = VGroup(*outputs[9:13])

        def feedback_path(src, dst):
            x0 = src.get_center()[0]
            x1 = dst.get_center()[0]
            top = y_output + 0.58
            low = y_input - 0.4
            mid = (x0 + x1) / 2
            return line_path(
                [
                    (x0, y_output + 0.18),
                    (x0, top),
                    (mid, top),
                    (mid, low),
                    (x1 - 0.22, low),
                    (x1, low),
                    (x1, y_input - 0.23),
                ],
                c["line"],
                1.25,
                0.34,
            )

        feedbacks = []
        for i in range(len(outputs) - 1):
            target = input_boxes[i + 1]
            p = feedback_path(outputs[i], target)
            feedbacks.append(p)

        background_paths = VGroup(col_guides, *feedbacks)
        background_paths.set_z_index(-1)

        diagram = VGroup(
            row_labels,
            background_paths,
            *input_boxes,
            bottom_labels,
            lm,
            *hidden_boxes,
            module_groups,
            *outputs,
        )

        cap = caption(
            [
                [
                    key("Discrete mode", c["lm_dark"]),
                    normal("samples tokens like normal"),
                ],
                [
                    normal("from the"),
                    key("LM Head", c["lm_dark"]),
                ],
            ],
            highlights=[(input_boxes[0], c["discrete_dark"]), (modules[0], c["lm_dark"]), (outputs[0], c["lm_dark"])],
        )
        self.play(FadeIn(title, shift=UP * 0.08), run_time=0.6)
        self.play(FadeIn(diagram, shift=UP * 0.05), FadeIn(cap), run_time=0.85)
        self.wait(0.6)

        bands = []
        for x in xs:
            band = Rectangle(
                width=0.86,
                height=4.98,
                fill_color=c["band"],
                fill_opacity=0,
                stroke_width=0,
            ).move_to([x, 0.56, 0])
            band.set_z_index(-2)
            bands.append(band)
            self.add(band)

        def reveal_box(mob):
            if isinstance(mob, VGroup) and len(mob) > 0 and isinstance(mob[0], VMobject):
                return [
                    mob[0].animate.set_fill(opacity=1).set_stroke(opacity=1),
                    mob[1].animate.set_opacity(1) if len(mob) > 1 else mob.animate.set_opacity(1),
                ]
            return [mob.animate.set_opacity(1)]

        def token_label_for_input(index):
            target_x = xs[index]
            for label in bottom_labels:
                if abs(label.get_center()[0] - target_x) < 0.02:
                    return label
            return None

        def new_caption(text, hold=0.62, highlights=None):
            nonlocal cap
            nxt = caption(text, highlights=highlights)
            self.play(FadeOut(cap, shift=DOWN * 0.03), FadeIn(nxt, shift=DOWN * 0.03), run_time=0.22)
            cap = nxt
            self.wait(hold)

        def shape_for_pulse(mob):
            if isinstance(mob, VGroup) and len(mob) > 0 and isinstance(mob[0], VMobject):
                return mob[0].copy()
            return SurroundingRectangle(mob, buff=0.05, color=c["line"], stroke_width=1.4)

        def pulse_anim(mob, color, fill_opacity=0.1, stroke_width=4.6, scale=1.08):
            halo = shape_for_pulse(mob)
            halo.set_fill(color, opacity=fill_opacity)
            halo.set_stroke(color, width=stroke_width, opacity=0.78)
            halo.set_z_index(4)
            return Succession(FadeIn(halo, scale=0.96), FadeOut(halo, scale=scale))

        def flow_segment(points, color, width=5.2, opacity=0.92, time_width=0.5):
            seg = line_path(points, color, width, opacity)
            seg.set_z_index(4)
            return ShowPassingFlash(seg, time_width=time_width)

        def flow_path(path, color, width=5.0, opacity=0.88, time_width=0.18):
            seg = path.copy().set_stroke(color=color, width=width, opacity=opacity)
            seg.set_z_index(4)
            return ShowPassingFlash(seg, time_width=time_width)

        def route_segments(col):
            x = xs[col]
            return [
                [(x, y_input + input_h / 2), (x, y_lm - lm_h / 2)],
                [(x, y_lm + lm_h / 2), (x, y_hidden - hidden_h / 2)],
                [(x, y_hidden + hidden_h / 2), (x, y_head - module_h / 2)],
                [(x, y_head + module_h / 2), (x, y_output - output_h / 2)],
            ]

        def route_colors(col):
            input_color = {
                "discrete": c["discrete_dark"],
                "latent": c["latent_dark"],
                "answer": c["answer_dark"],
            }[input_kinds[col]]
            module_color = c["proj_dark"] if col_is_latent[col] else c["lm_dark"]
            feedback_color = (
                c["answer_dark"]
                if col >= 9
                else c["latent_dark"]
                if col_is_latent[col]
                else c["discrete_dark"]
            )
            return {
                "input_to_lm": input_color,
                "lm_to_hidden": c["lm_dark"],
                "hidden_to_module": c["hidden_dark"],
                "module_to_output": module_color,
                "feedback": feedback_color,
            }

        def active_route_lines(col, colors, include_feedback=True):
            active = [
                line_path(segment, color, width=2.8, opacity=0.32)
                for segment, color in zip(
                    route_segments(col),
                    [
                        colors["input_to_lm"],
                        colors["lm_to_hidden"],
                        colors["hidden_to_module"],
                        colors["module_to_output"],
                    ],
                )
            ]
            if include_feedback and col < len(feedbacks):
                active.append(feedbacks[col].copy().set_stroke(color=colors["feedback"], width=2.8, opacity=0.32))
            lines = VGroup(*active)
            lines.set_z_index(3)
            return lines

        def reset_column_anims(col):
            module = modules[col_to_module[col]]
            return [
                bands[col].animate.set_fill(opacity=0),
                input_boxes[col][0].animate.set_stroke(input_strokes[col], width=1.4),
                hidden_boxes[col][0].animate.set_stroke(width=1.4),
                module[0].animate.set_stroke(module_strokes[col_to_module[col]], width=1.4),
                lm[0].animate.set_stroke(c["lm_dark"], width=1.4),
            ]

        feedback_run_time = 1.62
        feedback_lag = 0.76

        def do_step(col, stroke_override=None, band_override=None, stop_after_output=False):
            color = band_override or (c["band_latent"] if col_is_latent[col] else c["band"])
            stroke = stroke_override or (c["flow_latent"] if col_is_latent[col] else c["flow"])
            module = modules[col_to_module[col]]
            segments = route_segments(col)
            colors = route_colors(col)
            if stroke_override:
                colors["module_to_output"] = stroke_override
                colors["feedback"] = stroke_override
            active_lines = active_route_lines(col, colors, include_feedback=not stop_after_output)
            self.play(
                FadeIn(active_lines),
                bands[col].animate.set_fill(color, opacity=0.15),
                input_boxes[col][0].animate.set_stroke(colors["input_to_lm"], width=3.4),
                pulse_anim(input_boxes[col], colors["input_to_lm"], fill_opacity=0.09),
                flow_segment(segments[0], colors["input_to_lm"], time_width=0.64),
                run_time=0.36,
                rate_func=linear,
            )
            self.play(
                lm[0].animate.set_stroke(c["lm_dark"], width=2.2),
                flow_segment(segments[1], colors["lm_to_hidden"], time_width=0.58),
                *reveal_box(hidden_boxes[col]),
                run_time=0.48,
                rate_func=linear,
            )
            self.play(
                hidden_boxes[col][0].animate.set_stroke(colors["hidden_to_module"], width=3.2),
                module[0].animate.set_stroke(colors["module_to_output"], width=3.4),
                pulse_anim(hidden_boxes[col], colors["hidden_to_module"], fill_opacity=0.08),
                flow_segment(segments[2], colors["hidden_to_module"], time_width=0.56),
                run_time=0.42,
                rate_func=linear,
            )
            self.play(
                pulse_anim(module, colors["module_to_output"], fill_opacity=0.1),
                flow_segment(segments[3], colors["module_to_output"], time_width=0.58),
                *reveal_box(outputs[col]),
                run_time=0.48,
                rate_func=linear,
            )
            if stop_after_output:
                self.play(*reset_column_anims(col), run_time=0.5, rate_func=linear)
                self.play(FadeOut(active_lines), run_time=0.12)
                return
            target = col + 1
            animations = reveal_box(input_boxes[target])
            target_label = token_label_for_input(target)
            if target_label is not None:
                animations.append(target_label.animate.set_opacity(1))
            target_reveal = AnimationGroup(
                *animations,
                pulse_anim(input_boxes[target], colors["feedback"], fill_opacity=0.08),
                lag_ratio=0,
            )
            self.play(
                *reset_column_anims(col),
                LaggedStart(flow_path(feedbacks[col], colors["feedback"]), target_reveal, lag_ratio=feedback_lag),
                run_time=feedback_run_time,
                rate_func=linear,
            )
            self.play(FadeOut(active_lines), run_time=0.12)

        def do_final():
            for col in (9, 10, 11):
                do_step(col, stroke_override=c["flow_answer"], band_override=c["answer"])
            do_step(12, stroke_override=c["flow_answer"], band_override=c["answer"], stop_after_output=True)

        do_step(0)

        new_caption(
            [
                [
                    normal("When we sample a special"),
                    key("<bot> sequence", c["discrete_dark"]),
                ],
                [
                    normal("we switch to"),
                    key("Latent Mode", c["latent_dark"]),
                    normal("with the sequence's"),
                    key("budget", c["latent_dark"]),
                ],
            ],
            highlights=[(modules[0], c["lm_dark"]), (outputs[1], c["discrete_dark"]), (input_boxes[2], c["discrete_dark"])],
        )
        do_step(1)

        new_caption(
            [
                [
                    normal("During"),
                    key("Latent Mode", c["latent_dark"]),
                    normal("we pass"),
                    normal("the last hidden state"),
                    key(sub("h0"), c["hidden_dark"]),
                ],
                [
                    normal("to the"),
                    key("Reasoning Projector", c["proj_dark"]),
                ],
            ],
            highlights=[(input_boxes[2], c["discrete_dark"]), (hidden_boxes[2], c["hidden_dark"]), (modules[1], c["proj_dark"])],
        )
        do_step(2)

        new_caption(
            [
                [
                    normal("The"),
                    key("Reasoning Projector", c["proj_dark"]),
                    normal("predicts"),
                    key(sub("e0"), c["latent_dark"]),
                ],
                [
                    normal("which is passed as the next"),
                    key("token embedding", c["latent_dark"]),
                ],
            ],
            highlights=[(hidden_boxes[2], c["hidden_dark"]), (modules[1], c["proj_dark"]), (input_boxes[3], c["latent_dark"])],
        )
        do_step(3)

        new_caption(
            [
                [
                    normal("When the latent budget ends, we switch to"),
                    key("Discrete Mode", c["lm_dark"]),
                ],
                [
                    normal("and the"),
                    key("LM Head", c["lm_dark"]),
                    normal("samples a token"),
                    key(f"({sub('x2')})", c["lm_dark"]),
                ],
            ],
            highlights=[(input_boxes[4], c["latent_dark"]), (modules[2], c["lm_dark"]), (outputs[4], c["lm_dark"])],
        )
        do_step(4)

        new_caption(
            [
                [
                    key("Discrete mode", c["lm_dark"]),
                    normal("continues"),
                ],
                [
                    normal("until another"),
                    key("<bot>", c["discrete_dark"]),
                    normal("is sampled"),
                ],
            ],
            highlights=[(modules[2], c["lm_dark"]), (outputs[5], c["discrete_dark"]), (input_boxes[6], c["discrete_dark"])],
        )
        do_step(5)

        new_caption(
            [
                [
                    normal("In this case, the second"),
                    key("<bot> tag", c["discrete_dark"]),
                ],
                [
                    normal("starts a longer"),
                    key("Latent Mode", c["latent_dark"]),
                ],
            ],
            highlights=[(input_boxes[6], c["discrete_dark"]), (hidden_boxes[6], c["hidden_dark"]), (modules[3], c["proj_dark"]), (outputs[6], c["latent_dark"])],
        )
        do_step(6)

        new_caption(
            [
                [
                    key("Latent Mode", c["latent_dark"]),
                    normal("repeats the"),
                    key("Reasoning Projector", c["proj_dark"]),
                    normal("step"),
                ],
                [
                    normal("until the budget is used"),
                ],
            ],
            highlights=[(input_boxes[7], c["latent_dark"]), (modules[3], c["proj_dark"]), (outputs[7], c["latent_dark"])],
        )
        do_step(7)
        do_step(8)

        new_caption(
            [
                [
                    normal("Finally the"),
                    key("LM Head", c["lm_dark"]),
                    normal("samples"),
                    key("answer tokens", c["answer_dark"]),
                    normal("like normal"),
                ],
                [
                    normal("one token at a time"),
                ],
            ],
            highlights=[(answer_outputs, c["answer_dark"]), (modules[4], c["lm_dark"])],
        )
        do_final()
        self.wait(1.8)
