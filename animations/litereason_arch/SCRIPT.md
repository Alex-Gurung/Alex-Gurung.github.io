# LiteReason Architecture Animation Script

Captions describe the step that is about to animate. Highlights should point to
the active input, the module being used, and the output/embedding being created.

| Step | Visual action | Caption point |
| --- | --- | --- |
| 1 | `x_0` enters the Language Model, the first LM Head samples `x_1`, and `x_1` feeds back as the next input embedding. | Discrete mode samples tokens like normal from the LM Head |
| 2 | `x_1` enters the Language Model, the LM Head samples `<bot>`, and `<bot>` feeds back. | When we sample a special `<bot>` sequence, we switch to Latent Mode with the sequence's budget |
| 3 | `<bot>` enters latent mode; the Language Model produces `h_0`; the Reasoning Projector maps `h_0` to `e_0`. | During Latent Mode, pass the last hidden state to the Reasoning Projector |
| 4 | `e_0` feeds back as the next input embedding; the next pass produces `h_1` and `e_1`. | The projector output is passed as the next token embedding |
| 5 | The latent budget ends; `e_1` goes through the Language Model and the LM Head samples `x_2`. | When the latent budget ends, we switch to Discrete Mode and the LM Head samples a token (`x_2`) |
| 6 | `x_2` goes through the LM Head and samples a second `<bot>`. | Discrete mode continues until another `<bot>` is sampled |
| 7 | The second `<bot>` starts a longer Latent Mode; `h_2` is projected to `e_2`. | In this case, the second `<bot>` tag starts a longer Latent Mode |
| 8 | `e_2` and `e_3` feed back through repeated latent projector steps until the budget is used. | Latent Mode repeats the Reasoning Projector step until the budget is used |
| 9 | `e_4` exits latent mode, then the final LM Head samples `a_1`, `a_2`, `a_3`, and `a_4` one at a time. The animation stops after `a_4` is generated. | The LM Head samples answer tokens like normal, one at a time |

Route colors should encode what the signal just passed through:

- input embedding to Language Model: input type color
- Language Model to hidden state: LM blue
- hidden state to head/projector: hidden-state purple
- head/projector to output: module color
- output feedback to next input: generated output type color
