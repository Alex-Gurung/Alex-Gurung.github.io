---
layout: project_page
project_class: litereason-project
title: "Lightweight Latent Reasoning for Narrative Tasks"
permalink: /litereason/
sitemap: false
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
venue: "TACL 2026"
links:
  - text: arXiv
    url: "https://arxiv.org/abs/2512.02240"
    icon: "fas fa-file-alt"
  - text: Code
    url: "https://github.com/Alex-Gurung/LiteReason"
    icon: "fab fa-github"
charts_js: "/assets/js/litereason-charts.js"
bibtex: |
  @article{gurung2026lightweightlatentreasoning,
    title     = {Lightweight Latent Reasoning for Narrative Tasks},
    author    = {Alexander Gurung and Esmeralda S. Whitammer and Mirella Lapata},
    journal   = {Transactions of the Association for Computational Linguistics},
    year      = {2026},
    url       = {https://arxiv.org/abs/2512.02240}
  }
---

## Abstract

Large language models (LLMs) tackle complex tasks by generating long chains of thought or "reasoning traces" that act as latent variables in the generation of an output given a query. A model's ability to generate such traces can be optimized with reinforcement learning (RL) to improve their utility in predicting an answer. This optimization comes at a high computational cost, especially for narrative-related tasks that involve retrieving and processing many tokens.

To this end, we propose LiteReason, a latent reasoning method that can be interleaved with standard token sampling and easily combined with RL techniques. LiteReason employs a lightweight Reasoning Projector module, trained to produce continuous latent tokens that help the model "skip" reasoning steps. During RL, the policy model decides when to activate the projector, switching between latent and discrete reasoning as needed. Experimental results on plot hole detection and book chapter generation show that our method outperforms latent reasoning baselines and comes close to matching non-latent RL training, while reducing final reasoning length by 77-92%. Overall, LiteReason guides RL training to a more efficient part of the performance-computation tradeoff curve.

## TL;DR

<div class="tldr">
<strong>LiteReason</strong> adds a lightweight <em>Reasoning Projector</em> to an LLM, letting RL-trained models interleave normal token generation with continuous latent reasoning. On narrative tasks, it reaches 69-96% of the gains from non-latent RL while using 50-53% fewer training tokens and much shorter inference traces.
</div>

<div class="arch-diagram arch-video">
  <video controls playsinline preload="auto" poster="/assets/img/litereason/architecture-poster.png" aria-label="Animation explaining how LiteReason switches between LM Head sampling and Reasoning Projector latent embeddings.">
    <source src="/assets/video/litereason/architecture.mp4?v=20260608b" type="video/mp4">
  </video>
  <noscript>
    <img src="/assets/img/litereason/architecture-poster.png" alt="High-level diagram showing LiteReason switching between discrete LM Head sampling and latent Reasoning Projector embeddings.">
  </noscript>
  <p class="figure-caption"><strong>Figure 1.</strong> LiteReason alternates between the model's normal discrete sampling and latent reasoning. In discrete mode, the LM Head samples a token and its embedding is fed back as the next input. If the sampled token is an implicit-thought tag such as <code>&lt;bot&gt;</code> with a thought budget, generation switches to latent mode: the Reasoning Projector maps the last hidden state to a continuous embedding, feeds that embedding back for the budgeted number of steps, and then returns to discrete sampling. The model can switch between these modes multiple times before producing the final answer.</p>
</div>

## The LiteReason Framework

LiteReason keeps ordinary LM Head sampling but adds a Reasoning Projector. When the model emits an implicit-thought tag with a step budget, the projector predicts continuous token embeddings directly from the final hidden state before generation returns to text.

Training follows the paper's three-stage recipe: collect useful traces, initialize the projector with SFT, then run RL while treating only discrete token sampling as policy actions. After each RL epoch, LiteReason refreshes the projector on trajectories from the current policy. See the paper's "The LiteReason Framework" section for the full training recipe and inference procedure.

<div class="gen-animation-container" id="gen-animation">
  <span class="gen-label">Generation Preview</span>
  <div class="gen-output" id="gen-output"><span class="gen-cursor" id="gen-cursor"></span></div>
  <div class="gen-controls">
    <button id="gen-play-pause" onclick="toggleAnimation()" title="Play/Pause">&#x23F8;</button>
  </div>
</div>

## Application to Narrative Tasks

We evaluate on two narrative tasks: Flawed Fictions, a 414-example plot-hole detection benchmark, and Next Chapter Prediction (NCP), a 1,347-example book-planning task. The plots below show the main performance-compute tradeoff: better methods move right, and cheaper methods move down. LiteReason is the only latent-reasoning method that moves close to non-latent RL performance while staying far below it in generated-token cost.

<div class="stat-cards">
  <div class="stat-card">
    <div class="stat-number">77-92%</div>
    <div class="stat-label">fewer inference tokens vs. base</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">50-53%</div>
    <div class="stat-label">fewer training tokens</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">96%</div>
    <div class="stat-label">of RL gain on Flawed Fictions</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">69%</div>
    <div class="stat-label">of RL gain on NCP</div>
  </div>
</div>

### Flawed Fictions

Flawed Fictions asks whether a story contains a plot hole. RL improves Qwen2.5-7B from 57.26% to 88.71% accuracy, but still generates 114.53 tokens on average. LiteReason reaches 87.42% accuracy with 34.01 tokens, while prior latent baselines remain much closer to the base model.

<div class="figure-container">
  <div class="chart-wrapper">
    <canvas id="scatter-ff"></canvas>
    <div class="chart-tooltip" id="tooltip-ff"></div>
  </div>
  <p class="figure-caption"><strong>Figure 2.</strong> Accuracy vs. generated tokens on Flawed Fictions. Aside from RL-Trained, LiteReason is separated from the next-best method by roughly 20 accuracy points and about 100 generated tokens.</p>
</div>

### Next Chapter Prediction

NCP evaluates a generated plan for the next chapter in a book. We define a contrastive version of the <a href="https://arxiv.org/abs/2503.22828">VR-CLI objective</a> that measures how much a plan increases the likelihood of the true next chapter while decreasing the likelihood of other chapters, which we call Contrastive Improvement. The RL-trained model obtains the highest score (0.666) but uses 721.33 tokens on average. LiteReason obtains 0.478 with 193.11 tokens, landing on the same performance-cost frontier; CoLaR is similarly short but much weaker at 0.118.

<div class="figure-container">
  <div class="chart-wrapper">
    <canvas id="scatter-ncp"></canvas>
    <div class="chart-tooltip" id="tooltip-ncp"></div>
  </div>
  <p class="figure-caption"><strong>Figure 3.</strong> Contrastive Improvement vs. generated tokens on NCP. LiteReason is far cheaper than RL-Trained while substantially outperforming the other latent-reasoning baselines.</p>
</div>

## LiteReason Improves RL Efficiency: Fewer Tokens, Faster Inference

With the same RL steps and samples, LiteReason uses about half as many generated training tokens and is faster in wall-clock inference.

<p class="litereason-table-caption">
  <strong>RL training tokens.</strong> The RL and RL + LiteReason runs use the same RL epochs, steps, and samples; LiteReason generates 52.8% fewer tokens on Flawed Fictions and 49.5% fewer on NCP during training.
</p>

<div class="litereason-table-wrap">
  <table class="litereason-table is-compact">
    <thead>
      <tr>
        <th>Method</th>
        <th>FF Training Tokens &darr;</th>
        <th>NCP Training Tokens &darr;</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Method"><strong>RL</strong></td>
        <td data-label="FF Training Tokens &darr;">61.4M</td>
        <td data-label="NCP Training Tokens &darr;">108.8M</td>
      </tr>
      <tr>
        <td data-label="Method"><strong>RL + LiteReason</strong></td>
        <td data-label="FF Training Tokens &darr;"><strong>29.0M</strong> (-52.8%)</td>
        <td data-label="NCP Training Tokens &darr;"><strong>54.9M</strong> (-49.5%)</td>
      </tr>
    </tbody>
  </table>
</div>

<p class="litereason-table-caption">
  <strong>Inference wall-clock time.</strong> Mean seconds per example, averaged over three sequential repetitions, for Qwen2.5-7B models using vLLM on one H100. <code>b=1</code> runs one example at a time; <code>b=all</code> passes the full test set for parallel computation. The Latent column indicates whether LiteReason uses the latent-reasoning prompt at inference.
</p>

<div class="litereason-table-wrap">
  <table class="litereason-table is-compact">
    <thead>
      <tr>
        <th>Task</th>
        <th>Model</th>
        <th>Latent</th>
        <th>b=1 (s) &darr;</th>
        <th>b=all (s) &darr;</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Task"><strong>FF</strong></td>
        <td data-label="Model">Base</td>
        <td data-label="Latent">&times;</td>
        <td data-label="b=1 (s) &darr;">3.10</td>
        <td data-label="b=all (s) &darr;">0.13</td>
      </tr>
      <tr>
        <td data-label="Task"><strong>FF</strong></td>
        <td data-label="Model">RL-Trained</td>
        <td data-label="Latent">&times;</td>
        <td data-label="b=1 (s) &darr;">0.97</td>
        <td data-label="b=all (s) &darr;">0.06</td>
      </tr>
      <tr>
        <td data-label="Task"><strong>FF</strong></td>
        <td data-label="Model">LiteReason</td>
        <td data-label="Latent">&times;</td>
        <td data-label="b=1 (s) &darr;">0.83</td>
        <td data-label="b=all (s) &darr;">0.20</td>
      </tr>
      <tr>
        <td data-label="Task"><strong>FF</strong></td>
        <td data-label="Model">LiteReason</td>
        <td data-label="Latent">&#10003;</td>
        <td data-label="b=1 (s) &darr;"><strong>0.31</strong></td>
        <td data-label="b=all (s) &darr;"><strong>0.03</strong></td>
      </tr>
      <tr>
        <td data-label="Task"><strong>NCP</strong></td>
        <td data-label="Model">Base</td>
        <td data-label="Latent">&times;</td>
        <td data-label="b=1 (s) &darr;">8.02</td>
        <td data-label="b=all (s) &darr;">0.43</td>
      </tr>
      <tr>
        <td data-label="Task"><strong>NCP</strong></td>
        <td data-label="Model">RL-Trained</td>
        <td data-label="Latent">&times;</td>
        <td data-label="b=1 (s) &darr;">6.46</td>
        <td data-label="b=all (s) &darr;">0.42</td>
      </tr>
      <tr>
        <td data-label="Task"><strong>NCP</strong></td>
        <td data-label="Model">LiteReason</td>
        <td data-label="Latent">&times;</td>
        <td data-label="b=1 (s) &darr;">2.21</td>
        <td data-label="b=all (s) &darr;">0.26</td>
      </tr>
      <tr>
        <td data-label="Task"><strong>NCP</strong></td>
        <td data-label="Model">LiteReason</td>
        <td data-label="Latent">&#10003;</td>
        <td data-label="b=1 (s) &darr;"><strong>1.84</strong></td>
        <td data-label="b=all (s) &darr;"><strong>0.23</strong></td>
      </tr>
    </tbody>
  </table>
</div>

Compared with RL-Trained, LiteReason produces traces 73% smaller on Flawed Fictions and 70% smaller on NCP while still achieving 96% and 69% of the respective RL performance gains.

## LiteReason Combines with a DAPO-Style Length Penalty

A DAPO-style length penalty improves both standard RL and LiteReason on Flawed Fictions. LiteReason plus the penalty reaches 93.55% accuracy with 6.00 generated tokens on average, suggesting the method can combine cleanly with other RL reward shaping.

<div class="litereason-table-wrap">
  <table class="litereason-table is-compact">
    <thead>
      <tr>
        <th>Method</th>
        <th>Accuracy (%) &uarr;</th>
        <th>Tokens &darr;</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Method"><strong>RL-Trained</strong></td>
        <td data-label="Accuracy (%) &uarr;">88.71</td>
        <td data-label="Tokens &darr;">114.53</td>
      </tr>
      <tr>
        <td data-label="Method"><strong>RL-Trained + LP</strong></td>
        <td data-label="Accuracy (%) &uarr;">91.94</td>
        <td data-label="Tokens &darr;">16.65</td>
      </tr>
      <tr>
        <td data-label="Method"><strong>LiteReason</strong></td>
        <td data-label="Accuracy (%) &uarr;">87.42</td>
        <td data-label="Tokens &darr;">34.01</td>
      </tr>
      <tr>
        <td data-label="Method"><strong>LiteReason + LP</strong></td>
        <td data-label="Accuracy (%) &uarr;"><strong>93.55</strong></td>
        <td data-label="Tokens &darr;"><strong>6.00</strong></td>
      </tr>
    </tbody>
  </table>
</div>

## Does LiteReason Retain General Model Capabilities?

On GSM-Hard, AIME25, and MMLU-Redux, LiteReason and the RL-Trained baseline largely retain the abilities of Qwen2.5-7B. LiteReason models also reason more concisely, consistently producing fewer tokens than the base model and RL-Trained variants. The full paper table also compares latent-inference modes and non-LiteReason latent baselines.

<div class="litereason-table-wrap">
  <table class="litereason-table is-extra-wide is-compact">
    <thead>
      <tr>
        <th>Setting</th>
        <th>GSM Acc. &uarr;</th>
        <th>GSM Tokens &darr;</th>
        <th>AIME Acc. &uarr;</th>
        <th>AIME Tokens &darr;</th>
        <th>MMLU Acc. &uarr;</th>
        <th>MMLU Tokens &darr;</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Setting"><strong>No finetuning</strong></td>
        <td data-label="GSM Acc. &uarr;"><strong>27.3</strong></td>
        <td data-label="GSM Tokens &darr;">371.4</td>
        <td data-label="AIME Acc. &uarr;"><strong>11.3</strong></td>
        <td data-label="AIME Tokens &darr;">891.1</td>
        <td data-label="MMLU Acc. &uarr;">78.7</td>
        <td data-label="MMLU Tokens &darr;">317.0</td>
      </tr>
      <tr>
        <td data-label="Setting"><strong>FF RL-Trained</strong></td>
        <td data-label="GSM Acc. &uarr;">27.2</td>
        <td data-label="GSM Tokens &darr;">359.1</td>
        <td data-label="AIME Acc. &uarr;">10.0</td>
        <td data-label="AIME Tokens &darr;">857.3</td>
        <td data-label="MMLU Acc. &uarr;"><strong>79.0</strong></td>
        <td data-label="MMLU Tokens &darr;">300.5</td>
      </tr>
      <tr>
        <td data-label="Setting"><strong>FF LiteReason</strong></td>
        <td data-label="GSM Acc. &uarr;"><strong>27.3</strong></td>
        <td data-label="GSM Tokens &darr;"><strong>349.7</strong></td>
        <td data-label="AIME Acc. &uarr;">10.7</td>
        <td data-label="AIME Tokens &darr;"><strong>834.7</strong></td>
        <td data-label="MMLU Acc. &uarr;">78.8</td>
        <td data-label="MMLU Tokens &darr;"><strong>283.4</strong></td>
      </tr>
    </tbody>
  </table>
</div>

## Does LiteReason Work Across Model Size and Family?

On Flawed Fictions with Qwen3-4B-Instruct-2507, LiteReason improves accuracy from 33.23% to 57.42% while reducing output length from 1709.86 to 995.38 tokens. On GSM-Hard with Gemma-3-1B-IT, LiteReason largely matches the base model while producing about 10% fewer tokens.

<div class="litereason-table-wrap">
  <table class="litereason-table is-wide is-compact">
    <thead>
      <tr>
        <th>Task / Model</th>
        <th>Method</th>
        <th>Accuracy (%) &uarr;</th>
        <th>Tokens &darr;</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Task / Model"><strong>FF / Qwen3-4B</strong></td>
        <td data-label="Method">Base</td>
        <td data-label="Accuracy (%) &uarr;">33.23</td>
        <td data-label="Tokens &darr;">1709.86</td>
      </tr>
      <tr>
        <td data-label="Task / Model"><strong>FF / Qwen3-4B</strong></td>
        <td data-label="Method">RL-Trained</td>
        <td data-label="Accuracy (%) &uarr;"><strong>64.84</strong></td>
        <td data-label="Tokens &darr;">1078.57</td>
      </tr>
      <tr>
        <td data-label="Task / Model"><strong>FF / Qwen3-4B</strong></td>
        <td data-label="Method">LiteReason</td>
        <td data-label="Accuracy (%) &uarr;">57.42</td>
        <td data-label="Tokens &darr;"><strong>995.38</strong></td>
      </tr>
      <tr>
        <td data-label="Task / Model"><strong>GSM-Hard / Gemma3-1B</strong></td>
        <td data-label="Method">Base</td>
        <td data-label="Accuracy (%) &uarr;">14.70</td>
        <td data-label="Tokens &darr;">932.82</td>
      </tr>
      <tr>
        <td data-label="Task / Model"><strong>GSM-Hard / Gemma3-1B</strong></td>
        <td data-label="Method">RL-Trained</td>
        <td data-label="Accuracy (%) &uarr;"><strong>15.91</strong></td>
        <td data-label="Tokens &darr;">941.13</td>
      </tr>
      <tr>
        <td data-label="Task / Model"><strong>GSM-Hard / Gemma3-1B</strong></td>
        <td data-label="Method">LiteReason</td>
        <td data-label="Accuracy (%) &uarr;">15.76</td>
        <td data-label="Tokens &darr;"><strong>849.92</strong></td>
      </tr>
    </tbody>
  </table>
</div>
