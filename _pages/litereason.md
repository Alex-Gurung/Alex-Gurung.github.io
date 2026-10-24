---
layout: project_page
head_include: litereason/head.html
hero_include: litereason/hero.html
project_class: litereason-project
project_style: studio
hero_design: conversation
title: "Lightweight Latent Reasoning for Narrative Tasks"
permalink: /litereason/
description: "LiteReason adds a lightweight Reasoning Projector so RL-trained LLMs can interleave latent and discrete reasoning, cutting reasoning traces by 70-92% on narrative tasks (TACL 2026)."
og_image: https://alexgurung.me/assets/img/litereason/architecture-poster.png
authors:
  - name: Alexander Gurung
    affiliation: "1"
  - name: Esmeralda S. Whitammer
    affiliation: "1,2"
  - name: Mirella Lapata
    affiliation: "1"
affiliations:
  - id: "1"
    name: "University of Edinburgh"
  - id: "2"
    name: "CIFAR Fellow"
venue: "TACL 2026 (Presented at EMNLP 2026)"
links:
  - text: arxiv
    url: "https://arxiv.org/abs/2512.02240"
    icon: "fas fa-file-alt"
  - text: Code
    url: "https://github.com/Alex-Gurung/LiteReason"
    icon: "fab fa-github"
charts_js: "/assets/js/litereason-charts.js?v=20261024"
bibtex: |
  @article{gurung2026lightweightlatentreasoning,
    title     = {Lightweight Latent Reasoning for Narrative Tasks},
    author    = {Alexander Gurung and Esmeralda S. Whitammer and Mirella Lapata},
    journal   = {Transactions of the Association for Computational Linguistics},
    year      = {2026},
    url       = {https://arxiv.org/abs/2512.02240}
  }
---

## TL;DR

<div class="tldr">
<strong>LiteReason</strong> adds a lightweight <em>Reasoning Projector</em> to an LLM, letting RL-trained models interleave normal token generation with continuous latent reasoning. On narrative tasks, it reaches 69-96% of the gains from non-latent RL while cutting final reasoning traces by 70-73% and RL training tokens by about half. The savings come without hurting general capabilities (GSM-Hard, AIME25, MMLU-Redux), and stack with length-penalty reward shaping, producing the shortest <em>and</em> most performant model.
</div>

<div class="arch-diagram arch-video">
  <video controls playsinline preload="metadata" poster="/assets/img/litereason/architecture-poster.png" aria-label="Animation explaining how LiteReason switches between LM Head sampling and Reasoning Projector latent embeddings.">
    <source src="{{ '/assets/video/litereason/architecture.webm' | relative_url }}?v=20261024" type="video/webm">
    <source src="{{ '/assets/video/litereason/architecture.mp4' | relative_url }}?v=20261024" type="video/mp4">
  </video>
  <noscript>
    <img src="/assets/img/litereason/architecture-poster.png" alt="High-level diagram showing LiteReason switching between discrete LM Head sampling and latent Reasoning Projector embeddings.">
  </noscript>
  <p class="figure-caption"><strong>Figure 1.</strong> LiteReason alternates between the model's normal discrete sampling and latent reasoning. In discrete mode, the LM Head samples a token and its embedding is fed back as the next input. If the sampled token is an implicit-thought tag such as <code>&lt;bot&gt;</code> (shorthand for our <code>&lt;implicit_thought&gt;</code> tag) with a thought budget, generation switches to latent mode: the Reasoning Projector maps the last hidden state to a continuous embedding, feeds that embedding back for the budgeted number of steps, and then returns to discrete sampling. The model can switch between these modes multiple times before producing the final answer.</p>
</div>

## The LiteReason Framework

LiteReason keeps ordinary LM Head sampling but adds a Reasoning Projector. When the model emits an implicit-thought tag with a step budget, the projector predicts continuous token embeddings directly from the final hidden state before generation returns to text.

We train in three stages: collect useful traces, initialize the projector with SFT, then run RL while treating only discrete token sampling as policy actions. After each RL epoch, we refresh the projector on trajectories from the current policy. See our paper for the full training recipe and inference procedure.

<div class="gen-animation-container" id="gen-animation">
  <span class="gen-label">Example Generation</span>
  <div class="gen-output" id="gen-output"><span class="gen-cursor" id="gen-cursor"></span></div>
  <div class="gen-controls">
    <button id="gen-play-pause" onclick="toggleAnimation()" title="Play/Pause">&#x23F8;</button>
  </div>
</div>

<p class="figure-caption">Illustrative example of LiteReason inference on a Flawed Fictions-style input. Discrete tokens are sampled normally; an <code>&lt;implicit_thought&gt;n&lt;/implicit_thought&gt;</code> tag switches the model into latent mode for <em>n</em> steps (the pulsing dots) before discrete generation resumes.</p>

## Narrative Reasoning Requires Longer, More Varied Steps

Most latent reasoning methods are developed on math and synthetic logic benchmarks, where a single reasoning step is short and formulaic: an equation, or a one-line rule. The narrative tasks we study are different. A reasoning step must track characters, plot constraints, and information spread across thousands of tokens of context, so steps are longer, more varied, and harder to compress into latent tokens.

<p class="litereason-table-caption">
  <strong>Example reasoning steps.</strong> Steps from common latent-reasoning benchmarks (top) are short and formulaic; steps from our narrative tasks (bottom) are longer, reference long-range context, and vary in structure.
</p>

<div class="litereason-table-wrap">
  <table class="litereason-table is-wide lr-example-table">
<thead>
<tr>
<th>Dataset</th>
<th>Example Reasoning Step</th>
</tr>
</thead>
<tbody>
<tr>
<th data-label="Dataset" scope="row">GSM8K-Aug</th>
<td data-label="Example Reasoning Step">The helmet costs $15 × 2 = $30.</td>
</tr>
<tr>
<th data-label="Dataset" scope="row">ProsQA</th>
<td data-label="Example Reasoning Step">Every bompus is a wumpus.</td>
</tr>
<tr>
<th data-label="Dataset" scope="row">ProntoQA</th>
<td data-label="Example Reasoning Step">Each vumpus is mean.</td>
</tr>
<tr>
<th data-label="Dataset" scope="row">Flawed Fictions</th>
<td data-label="Example Reasoning Step">The continuity error occurs because the story earlier establishes that the little girl was very poor and had no room to live in or bed to sleep in, but later it states that she returned to her small bed in the shelter with her newfound wealth.</td>
</tr>
<tr>
<th data-label="Dataset" scope="row">Next Chapter Prediction</th>
<td data-label="Example Reasoning Step"><code>&lt;citation&gt;</code>Source A (Character Sheet: Rose) says Rose is rebellious, disobedient, and has a sarcastic sense of humor.<code>&lt;/citation&gt;</code>, therefore <code>&lt;reasoning&gt;</code>Rose will likely continue to challenge authority figures and express her opinions, possibly provoking Miss Wellwood and leading to a confrontation.<code>&lt;/reasoning&gt;</code></td>
</tr>
</tbody>
</table>
</div>

These narrative steps are what the Reasoning Projector must learn to skip: each latent thought stands in for a sentence-level step like the ones above, not a single short equation.

## LiteReason Approaches RL Performance with Fewer Tokens

We evaluate on two narrative tasks: Flawed Fictions, a 414-example plot-hole detection benchmark, and Next Chapter Prediction (NCP), a 1,347-example book-planning task. The plots below show the main performance-compute tradeoff: better methods move right, and cheaper methods move down. LiteReason is the only latent-reasoning method that moves close to non-latent RL performance while staying far below it in generated-token cost.

<div class="stat-cards">
  <div class="stat-card">
    <div class="stat-number">69-96%</div>
    <div class="stat-label">of non-latent RL gains</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">77-92%</div>
    <div class="stat-label">fewer inference tokens vs. base</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">49-53%</div>
    <div class="stat-label">fewer RL training tokens</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">~3&times;</div>
    <div class="stat-label">faster single-example inference vs. RL</div>
  </div>
</div>

### Flawed Fictions

Flawed Fictions asks whether a story contains a plot hole. RL improves Qwen2.5-7B from 57.26% to 88.71% accuracy, but still generates 114.53 tokens on average. LiteReason reaches 87.42% accuracy with 34.01 tokens, while prior latent baselines remain much closer to the base model.

<div class="figure-container">
  <div class="chart-wrapper">
    <canvas id="scatter-ff" role="img" aria-label="Scatter plot of accuracy versus generated tokens on Flawed Fictions. LiteReason reaches 87.42 percent accuracy with 34 tokens, close to RL-Trained's 88.71 percent at 115 tokens, while latent baselines like MoI, Soft Thinking, COCONUT, and CoLaR stay near the base model's 57 percent."></canvas>
    <div class="chart-tooltip" id="tooltip-ff"></div>
  </div>
  <p class="figure-caption"><strong>Figure 2.</strong> Accuracy vs. generated tokens on Flawed Fictions. Aside from RL-Trained, LiteReason is separated from the next-best method by roughly 30 accuracy points and about 190 generated tokens.</p>
</div>

### Next Chapter Prediction

NCP evaluates a generated plan for the next chapter in a book. We define a contrastive version of the <a href="https://arxiv.org/abs/2503.22828">VR-CLI objective</a> that measures how much a plan increases the likelihood of the true next chapter while decreasing the likelihood of other chapters, which we call Contrastive Improvement. The RL-trained model obtains the highest score (0.666) but uses 721.33 tokens on average. LiteReason obtains 0.478 with 193.11 tokens, landing on the same performance-cost frontier; CoLaR is similarly short but much weaker at 0.118.

<div class="figure-container">
  <div class="chart-wrapper">
    <canvas id="scatter-ncp" role="img" aria-label="Scatter plot of Contrastive Improvement versus generated tokens on Next Chapter Prediction. LiteReason scores 0.478 with 193 tokens; RL-Trained scores 0.666 with 721 tokens; latent baselines all score 0.118 or below."></canvas>
    <div class="chart-tooltip" id="tooltip-ncp"></div>
  </div>
  <p class="figure-caption"><strong>Figure 3.</strong> Contrastive Improvement vs. generated tokens on NCP. LiteReason is far cheaper than RL-Trained while substantially outperforming the other latent-reasoning baselines.</p>
</div>

## LiteReason Improves RL Efficiency

With the same RL steps and samples, LiteReason uses about half as many generated training tokens and is faster in wall-clock inference.

<p class="litereason-table-caption">
  <strong>RL training tokens.</strong> The RL and RL + LiteReason runs use the same RL epochs, steps, and samples; LiteReason generates 52.8% fewer tokens on Flawed Fictions and 49.5% fewer on NCP during training.
</p>

<div class="litereason-table-wrap">
<table class="litereason-table is-compact lr-data-table">
<thead>
<tr>
<th scope="col">Method</th>
<th scope="col">FF Training Tokens ↓</th>
<th scope="col">NCP Training Tokens ↓</th>
</tr>
</thead>
<tbody>
<tr>
<th data-label="Method" scope="row">RL</th>
<td data-label="FF Training Tokens ↓">61.4M</td>
<td data-label="NCP Training Tokens ↓">108.8M</td>
</tr>
<tr class="lr-result-row">
<th data-label="Method" scope="row">RL + LiteReason</th>
<td data-label="FF Training Tokens ↓"><strong class="lr-best">29.0M</strong><span class="lr-table-delta">(-52.8%)</span></td>
<td data-label="NCP Training Tokens ↓"><strong class="lr-best">54.9M</strong><span class="lr-table-delta">(-49.5%)</span></td>
</tr>
</tbody>
</table>
</div>

<p class="litereason-table-caption">
  <strong>Inference wall-clock time.</strong> Mean seconds per example, averaged over three sequential repetitions, for Qwen2.5-7B models using vLLM on one H100. <code>b=1</code> runs one example at a time; <code>b=all</code> passes the full test set for parallel computation. The Latent column indicates whether LiteReason uses the latent-reasoning prompt at inference.
</p>

<div aria-label="Inference wall-clock time results" class="litereason-table-wrap lr-wide-wrap" role="region" tabindex="0"><table class="litereason-table is-compact lr-data-table lr-timing-table"><thead><tr><th scope="col">Task</th><th scope="col">Model</th><th scope="col">Latent</th><th scope="col">b=1 (s) ↓</th><th scope="col">b=all (s) ↓</th></tr></thead><tbody><tr><th class="lr-task-group" rowspan="4" scope="rowgroup">FF</th>
<th data-label="Model" scope="row">Base</th>
<td aria-label="Latent reasoning disabled" class="lr-latent-state" data-label="Latent">×</td>
<td data-label="b=1 (s) ↓">3.10</td>
<td data-label="b=all (s) ↓">0.13</td>
</tr><tr>
<th data-label="Model" scope="row">RL-Trained</th>
<td aria-label="Latent reasoning disabled" class="lr-latent-state" data-label="Latent">×</td>
<td data-label="b=1 (s) ↓">0.97</td>
<td data-label="b=all (s) ↓">0.06</td>
</tr><tr class="lr-result-row">
<th data-label="Model" scope="row">LiteReason</th>
<td aria-label="Latent reasoning disabled" class="lr-latent-state" data-label="Latent">×</td>
<td data-label="b=1 (s) ↓">0.83</td>
<td data-label="b=all (s) ↓">0.20</td>
</tr><tr class="lr-result-row">
<th data-label="Model" scope="row">LiteReason</th>
<td aria-label="Latent reasoning enabled" class="lr-latent-state" data-label="Latent">✓</td>
<td data-label="b=1 (s) ↓"><strong class="lr-best">0.31</strong></td>
<td data-label="b=all (s) ↓"><strong class="lr-best">0.03</strong></td>
</tr></tbody><tbody><tr><th class="lr-task-group" rowspan="4" scope="rowgroup">NCP</th>
<th data-label="Model" scope="row">Base</th>
<td aria-label="Latent reasoning disabled" class="lr-latent-state" data-label="Latent">×</td>
<td data-label="b=1 (s) ↓">8.02</td>
<td data-label="b=all (s) ↓">0.43</td>
</tr><tr>
<th data-label="Model" scope="row">RL-Trained</th>
<td aria-label="Latent reasoning disabled" class="lr-latent-state" data-label="Latent">×</td>
<td data-label="b=1 (s) ↓">6.46</td>
<td data-label="b=all (s) ↓">0.42</td>
</tr><tr class="lr-result-row">
<th data-label="Model" scope="row">LiteReason</th>
<td aria-label="Latent reasoning disabled" class="lr-latent-state" data-label="Latent">×</td>
<td data-label="b=1 (s) ↓">2.21</td>
<td data-label="b=all (s) ↓">0.26</td>
</tr><tr class="lr-result-row">
<th data-label="Model" scope="row">LiteReason</th>
<td aria-label="Latent reasoning enabled" class="lr-latent-state" data-label="Latent">✓</td>
<td data-label="b=1 (s) ↓"><strong class="lr-best">1.84</strong></td>
<td data-label="b=all (s) ↓"><strong class="lr-best">0.23</strong></td>
</tr></tbody></table></div>

Compared with RL-Trained, LiteReason produces traces 70% smaller on Flawed Fictions and 73% smaller on NCP while still achieving 96% and 69% of the respective RL performance gains.

## LiteReason Combines with Length-Based Reward Shaping

A DAPO-style length penalty improves both standard RL and LiteReason on Flawed Fictions. LiteReason plus the penalty reaches 93.55% accuracy with 6.00 generated tokens on average, suggesting the method can combine cleanly with other RL reward shaping.

<div class="litereason-table-wrap">
<table class="litereason-table is-compact lr-data-table lr-reward-table">
<thead>
<tr>
<th scope="col">Method</th>
<th scope="col">Accuracy (%) ↑</th>
<th scope="col">Tokens ↓</th>
</tr>
</thead>

<tbody><tr>
<th data-label="Method" scope="row">RL-Trained</th>
<td data-label="Accuracy (%) ↑">88.71</td>
<td data-label="Tokens ↓">114.53</td>
</tr><tr>
<th data-label="Method" scope="row">RL-Trained + LP</th>
<td data-label="Accuracy (%) ↑">91.94</td>
<td data-label="Tokens ↓">16.65</td>
</tr></tbody><tbody><tr class="lr-result-row">
<th data-label="Method" scope="row"><strong>LiteReason</strong></th>
<td data-label="Accuracy (%) ↑"><strong>87.42</strong></td>
<td data-label="Tokens ↓"><strong>34.01</strong></td>
</tr><tr class="lr-result-row">
<th data-label="Method" scope="row"><strong>LiteReason + LP</strong></th>
<td data-label="Accuracy (%) ↑"><strong class="lr-best">93.55</strong></td>
<td data-label="Tokens ↓"><strong class="lr-best">6.00</strong></td>
</tr></tbody></table>
</div>

## LiteReason Retains General Model Capabilities

On GSM-Hard, AIME25, and MMLU-Redux, LiteReason and the RL-Trained baseline largely retain the abilities of Qwen2.5-7B. LiteReason models also reason more concisely, consistently producing fewer tokens than the base model and RL-Trained variants. The full table in our paper also compares latent-inference modes and non-LiteReason latent baselines.

<p class="litereason-table-caption">Cross-task generalization with standard token inference (latent mode off). Values are mean accuracy (%) and generated tokens from Table 10.</p>
<div aria-label="Cross-task generalization results" class="litereason-table-wrap lr-wide-wrap" role="region" tabindex="0">
<table class="litereason-table is-compact lr-data-table lr-generalization">
<thead><tr><th rowspan="2" scope="col">Task</th><th rowspan="2" scope="col">Method</th><th colspan="2" scope="colgroup">GSM-Hard</th><th colspan="2" scope="colgroup">AIME25</th><th colspan="2" scope="colgroup">MMLU-Redux</th></tr>
<tr><th scope="col">Acc. (%) ↑</th><th scope="col">Tokens ↓</th><th scope="col">Acc. (%) ↑</th><th scope="col">Tokens ↓</th><th scope="col">Acc. (%) ↑</th><th scope="col">Tokens ↓</th></tr></thead><tbody><tr><th colspan="2" scope="row">No finetuning</th><td data-label="Acc. (%) ↑"><strong class="lr-best">27.3</strong></td><td data-label="Tokens ↓">371.4</td><td data-label="Acc. (%) ↑"><strong class="lr-best">11.3</strong></td><td data-label="Tokens ↓">891.1</td><td data-label="Acc. (%) ↑">78.7</td><td data-label="Tokens ↓">317.0</td></tr></tbody><tbody><tr><th class="lr-task-group" rowspan="3" scope="rowgroup">FF</th><th scope="row">RL-Trained</th><td data-label="Acc. (%) ↑">27.2</td><td data-label="Tokens ↓">359.1</td><td data-label="Acc. (%) ↑">10.0</td><td data-label="Tokens ↓">857.3</td><td data-label="Acc. (%) ↑"><strong class="lr-best">79.0</strong></td><td data-label="Tokens ↓">300.5</td></tr><tr class="lr-result-row"><th scope="row">LiteReason</th><td data-label="Acc. (%) ↑"><strong class="lr-best">27.3</strong></td><td data-label="Tokens ↓">349.7</td><td data-label="Acc. (%) ↑">10.7</td><td data-label="Tokens ↓">834.7</td><td data-label="Acc. (%) ↑">78.8</td><td data-label="Tokens ↓">283.4</td></tr><tr><th scope="row">CoLaR</th><td data-label="Acc. (%) ↑">27.1</td><td data-label="Tokens ↓">372.2</td><td data-label="Acc. (%) ↑">8.0</td><td data-label="Tokens ↓">876.1</td><td data-label="Acc. (%) ↑">78.9</td><td data-label="Tokens ↓">328.4</td></tr></tbody><tbody><tr><th class="lr-task-group" rowspan="3" scope="rowgroup">NCP</th><th scope="row">RL-Trained</th><td data-label="Acc. (%) ↑"><strong class="lr-best">27.3</strong></td><td data-label="Tokens ↓">365.0</td><td data-label="Acc. (%) ↑">10.0</td><td data-label="Tokens ↓">912.7</td><td data-label="Acc. (%) ↑">78.8</td><td data-label="Tokens ↓">297.9</td></tr><tr class="lr-result-row"><th scope="row">LiteReason</th><td data-label="Acc. (%) ↑">26.5</td><td data-label="Tokens ↓"><strong class="lr-best">334.4</strong></td><td data-label="Acc. (%) ↑">4.0</td><td data-label="Tokens ↓">737.2</td><td data-label="Acc. (%) ↑">78.2</td><td data-label="Tokens ↓"><strong class="lr-best">250.0</strong></td></tr><tr><th scope="row">CoLaR</th><td data-label="Acc. (%) ↑">5.9</td><td data-label="Tokens ↓">716.0</td><td data-label="Acc. (%) ↑">0.7</td><td data-label="Tokens ↓"><strong class="lr-best">655.0</strong></td><td data-label="Acc. (%) ↑">26.9</td><td data-label="Tokens ↓">424.0</td></tr></tbody></table></div>

## LiteReason Works Across Model Sizes and Families

On Flawed Fictions with Qwen3-4B-Instruct-2507, LiteReason improves accuracy from 33.23% to 57.42% while reducing output length from 1709.86 to 995.38 tokens. On GSM-Hard with Gemma-3-1B-IT, LiteReason largely matches the base model while producing about 9% fewer tokens.

<div class="lr-table-pair">
<div class="litereason-table-wrap"><table class="litereason-table is-compact lr-data-table"><caption>Flawed Fictions<span class="lr-table-subtitle">Qwen3-4B</span></caption>
<thead>
<tr>
<th scope="col">Method</th>
<th scope="col">Accuracy (%) ↑</th>
<th scope="col">Tokens ↓</th>
</tr>
</thead>
<tbody><tr>
<th data-label="Method" scope="row">Base</th>
<td data-label="Accuracy (%) ↑">33.23</td>
<td data-label="Tokens ↓">1709.86</td>
</tr><tr>
<th data-label="Method" scope="row">RL-Trained</th>
<td data-label="Accuracy (%) ↑"><strong class="lr-best">64.84</strong></td>
<td data-label="Tokens ↓">1078.57</td>
</tr><tr class="lr-result-row">
<th data-label="Method" scope="row">LiteReason</th>
<td data-label="Accuracy (%) ↑">57.42</td>
<td data-label="Tokens ↓"><strong class="lr-best">995.38</strong></td>
</tr></tbody>
</table></div>
<div class="litereason-table-wrap"><table class="litereason-table is-compact lr-data-table"><caption>GSM-Hard<span class="lr-table-subtitle">Gemma3-1B</span></caption>
<thead>
<tr>
<th scope="col">Method</th>
<th scope="col">Accuracy (%) ↑</th>
<th scope="col">Tokens ↓</th>
</tr>
</thead>
<tbody><tr>
<th data-label="Method" scope="row">Base</th>
<td data-label="Accuracy (%) ↑">14.70</td>
<td data-label="Tokens ↓">932.82</td>
</tr><tr>
<th data-label="Method" scope="row">RL-Trained</th>
<td data-label="Accuracy (%) ↑"><strong class="lr-best">15.91</strong></td>
<td data-label="Tokens ↓">941.13</td>
</tr><tr class="lr-result-row">
<th data-label="Method" scope="row">LiteReason</th>
<td data-label="Accuracy (%) ↑">15.76</td>
<td data-label="Tokens ↓"><strong class="lr-best">849.92</strong></td>
</tr></tbody>
</table></div>
</div>

## Takeaways

- A lightweight Reasoning Projector is enough to bring latent reasoning into RL: the policy decides when to switch into latent mode, and only discrete tokens are treated as policy actions.
- On narrative tasks, LiteReason recovers 69-96% of non-latent RL's gains while producing 70-73% shorter final traces and using about half the RL training tokens.
- The savings come without losing general capabilities, and stack with other reward shaping: with a DAPO-style length penalty, LiteReason reaches 93.55% accuracy on Flawed Fictions with just 6 generated tokens.

<script src="{{ "/assets/js/litereason/generation.js" | relative_url }}?v=20261024"></script>

<script src="{{ "/assets/js/litereason/page.js" | relative_url }}?v=20261024"></script>

<script src="{{ "/assets/js/litereason/hero.js" | relative_url }}?v=20261024c"></script>
