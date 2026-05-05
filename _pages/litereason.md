---
layout: project_page
title: "Lightweight Latent Reasoning for Narrative Tasks"
permalink: /litereason/
sitemap: false
authors:
  - name: Alexander Gurung
    affiliation: "1"
    url: "https://Alex-Gurung.github.io"
  - name: Nikolay Malkin
    affiliation: "1,2"
    url: "https://malkin1729.github.io"
  - name: Mirella Lapata
    affiliation: "1"
    url: "https://homepages.inf.ed.ac.uk/mlap/"
affiliations:
  - id: "1"
    name: "University of Edinburgh"
  - id: "2"
    name: "Mila"
venue: "ICLR 2026 &middot; Latent & Implicit Thinking Workshop"
links:
  - text: arXiv
    url: "https://arxiv.org/abs/2512.02240"
    icon: "fas fa-file-alt"
charts_js: "/assets/js/litereason-charts.js"
bibtex: |
  @inproceedings{gurung2026lightweightlatentreasoning,
    title     = {Lightweight Latent Reasoning for Narrative Tasks},
    author    = {Alexander Gurung and Nikolay Malkin and Mirella Lapata},
    booktitle = {Latent \& Implicit Thinking Workshop at ICLR},
    year      = {2026},
    url       = {https://arxiv.org/abs/2512.02240}
  }
---

## TL;DR

<div class="tldr">
<strong>LiteReason</strong> adds a lightweight <em>Reasoning Projector</em> to an LLM, enabling it to switch between discrete token generation and continuous latent reasoning during RL training. This reduces reasoning tokens by 77-92% while retaining most performance.
</div>

<div class="arch-diagram">
<svg id="arch-svg" viewBox="0 -8 960 330" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" role="img" aria-label="Architecture diagram showing the dual-path reasoning approach of LiteReason">
  <defs>
    <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,1 L7,4 L0,7" fill="none" stroke="#888" stroke-width="1.3"/></marker>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- ============================================================ -->
  <!-- BACKGROUND: Vertical connectors + feedback arrows             -->
  <!-- (rendered first = behind modules)                             -->
  <!-- 13 columns at 60px spacing: c0=74..c12=794                  -->
  <!-- ============================================================ -->
  <!-- Vertical connectors: input embed top (y=182) → output tokens (with arrowheads) -->
  <g stroke="#999" stroke-width="1.4" opacity="0.85">
    <line x1="74"  y1="182" x2="74"  y2="30" marker-end="url(#arr)"/>
    <line x1="134" y1="182" x2="134" y2="30" marker-end="url(#arr)"/>
    <line x1="194" y1="182" x2="194" y2="38" marker-end="url(#arr)"/>
    <line x1="254" y1="182" x2="254" y2="38" marker-end="url(#arr)"/>
    <line x1="314" y1="182" x2="314" y2="30" marker-end="url(#arr)"/>
    <line x1="374" y1="182" x2="374" y2="30" marker-end="url(#arr)"/>
    <line x1="434" y1="182" x2="434" y2="38" marker-end="url(#arr)"/>
    <line x1="494" y1="182" x2="494" y2="38" marker-end="url(#arr)"/>
    <line x1="554" y1="182" x2="554" y2="38" marker-end="url(#arr)"/>
    <line x1="614" y1="182" x2="614" y2="96"/>
    <line x1="674" y1="182" x2="674" y2="96"/>
    <line x1="734" y1="182" x2="734" y2="96"/>
    <line x1="794" y1="182" x2="794" y2="96"/>
  </g>
  <!-- Feedback arrows -->
  <g opacity="0.55">
    <!-- Arrow 1: I0(74)→I1(134), mid=104 -->
    <path d="M74,30 L74,4 L104,4 L104,220 L124,220 L134,220 L134,212" fill="none" stroke="#999" stroke-width="1" marker-end="url(#arr)"/>
    <!-- Arrow 2: I1(134)→I2(194), mid=164 -->
    <path d="M134,30 L134,1 L164,1 L164,220 L184,220 L194,220 L194,212" fill="none" stroke="#999" stroke-width="1" marker-end="url(#arr)"/>
    <!-- Arrow 3: I2(194)→I3(254), mid=224 -->
    <path d="M194,38 L194,46 L224,46 L224,220 L244,220 L254,220 L254,212" fill="none" stroke="#999" stroke-width="1" marker-end="url(#arr)"/>
    <!-- Arrow 4: I3(254)→I4(314), mid=284 -->
    <path d="M254,38 L254,46 L284,46 L284,220 L304,220 L314,220 L314,212" fill="none" stroke="#999" stroke-width="1" marker-end="url(#arr)"/>
    <!-- Arrow 5: I4(314)→I5(374), mid=344 -->
    <path d="M314,30 L314,-2 L344,-2 L344,220 L364,220 L374,220 L374,212" fill="none" stroke="#999" stroke-width="1" marker-end="url(#arr)"/>
    <!-- Arrow 6: I5(374)→I6(434), mid=404 -->
    <path d="M374,30 L374,-5 L404,-5 L404,220 L424,220 L434,220 L434,212" fill="none" stroke="#999" stroke-width="1" marker-end="url(#arr)"/>
    <!-- Arrow 7: I6(434)→I7(494), mid=464 -->
    <path d="M434,38 L434,46 L464,46 L464,220 L484,220 L494,220 L494,212" fill="none" stroke="#999" stroke-width="1" marker-end="url(#arr)"/>
    <!-- Arrow 8: I7(494)→I8(554), mid=524 -->
    <path d="M494,38 L494,46 L524,46 L524,220 L544,220 L554,220 L554,212" fill="none" stroke="#999" stroke-width="1" marker-end="url(#arr)"/>
    <!-- Arrow 9: I8(554)→I9(614), mid=584 -->
    <path d="M554,38 L554,46 L584,46 L584,220 L604,220 L614,220 L614,212" fill="none" stroke="#999" stroke-width="1" marker-end="url(#arr)"/>
  </g>

  <!-- ============================================================ -->
  <!-- Left annotations                                              -->
  <!-- ============================================================ -->
  <text x="48" y="24" text-anchor="end" font-size="9" fill="#888">output token /</text>
  <text x="48" y="33" text-anchor="end" font-size="9" fill="#888">embedding</text>
  <line x1="50" y1="28" x2="62" y2="28" stroke="#bbb" stroke-dasharray="3,2" stroke-width="0.8"/>
  <text x="48" y="80" text-anchor="end" font-size="9" fill="#888">head / projector</text>
  <line x1="50" y1="78" x2="62" y2="78" stroke="#bbb" stroke-dasharray="3,2" stroke-width="0.8"/>
  <text x="48" y="134" text-anchor="end" font-size="9" fill="#888">last hidden state</text>
  <line x1="50" y1="130" x2="62" y2="130" stroke="#bbb" stroke-dasharray="3,2" stroke-width="0.8"/>
  <text x="48" y="200" text-anchor="end" font-size="9" fill="#888">input embedding</text>
  <line x1="50" y1="197" x2="62" y2="197" stroke="#bbb" stroke-dasharray="3,2" stroke-width="0.8"/>
  <text x="48" y="246" text-anchor="end" font-size="9" fill="#888">input token</text>
  <line x1="50" y1="243" x2="62" y2="243" stroke="#bbb" stroke-dasharray="3,2" stroke-width="0.8"/>

  <!-- ============================================================ -->
  <!-- Input token labels (bottom row)                               -->
  <!-- ============================================================ -->
  <text x="74" y="247" text-anchor="middle" font-size="10" fill="#555">x&#x2080;</text>
  <text x="134" y="247" text-anchor="middle" font-size="10" fill="#555">x&#x2081;</text>
  <text x="194" y="247" text-anchor="middle" font-size="9" fill="#555">&#x27E8;bot&#x27E9;</text>
  <text x="374" y="247" text-anchor="middle" font-size="10" fill="#555">x&#x2096;</text>
  <text x="434" y="247" text-anchor="middle" font-size="9" fill="#555">&#x27E8;bot&#x27E9;</text>
  <text x="734" y="247" text-anchor="middle" font-size="9" fill="#555">[Answer]</text>

  <!-- ============================================================ -->
  <!-- Input embeddings (y=182, h=30, w=42)                         -->
  <!-- ============================================================ -->
  <!-- Discrete (yellow) - IDs embed-{col} for JS animation -->
  <rect id="embed-0" x="53" y="182" width="42" height="30" rx="4" fill="#F5E6A3" stroke="#D4C463" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="embed-1" x="113" y="182" width="42" height="30" rx="4" fill="#F5E6A3" stroke="#D4C463" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="embed-2" x="173" y="182" width="42" height="30" rx="4" fill="#F5E6A3" stroke="#D4C463" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="embed-5" x="353" y="182" width="42" height="30" rx="4" fill="#F5E6A3" stroke="#D4C463" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="embed-6" x="413" y="182" width="42" height="30" rx="4" fill="#F5E6A3" stroke="#D4C463" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="embed-10" x="653" y="182" width="42" height="30" rx="4" fill="#F5E6A3" stroke="#D4C463" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="embed-11" x="713" y="182" width="42" height="30" rx="4" fill="#F5E6A3" stroke="#D4C463" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="embed-12" x="773" y="182" width="42" height="30" rx="4" fill="#F5E6A3" stroke="#D4C463" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <!-- Continuous (pink) -->
  <rect id="embed-3" x="233" y="182" width="42" height="30" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="254" y="201" text-anchor="middle" font-size="10" fill="#555">e&#x2080;</text>
  <rect id="embed-4" x="293" y="182" width="42" height="30" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="314" y="201" text-anchor="middle" font-size="10" fill="#555">e&#x2081;</text>
  <rect id="embed-7" x="473" y="182" width="42" height="30" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="494" y="201" text-anchor="middle" font-size="10" fill="#555">e&#x2082;</text>
  <rect id="embed-8" x="533" y="182" width="42" height="30" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="554" y="201" text-anchor="middle" font-size="10" fill="#555">e&#x2083;</text>
  <rect id="embed-9" x="593" y="182" width="42" height="30" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="614" y="201" text-anchor="middle" font-size="10" fill="#555">e&#x2084;</text>

  <!-- ============================================================ -->
  <!-- Language Model bar (y=148, h=28)                              -->
  <!-- ============================================================ -->
  <rect id="lm-bar" x="53" y="148" width="762" height="28" rx="5" fill="#93A4BD" stroke="#7B8FA8" stroke-width="1.2" style="transition: fill 0.3s ease, filter 0.3s ease;"/>
  <text x="434" y="166" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">Language Model</text>

  <!-- ============================================================ -->
  <!-- Hidden states (y=118, h=24, w=42)                             -->
  <!-- ============================================================ -->
  <rect id="hidden-0" x="53" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="hidden-1" x="113" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="hidden-2" x="173" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="194" y="134" text-anchor="middle" font-size="9" font-weight="600" fill="#555">h&#x2080;</text>
  <rect id="hidden-3" x="233" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="254" y="134" text-anchor="middle" font-size="9" font-weight="600" fill="#555">h&#x2081;</text>
  <rect id="hidden-4" x="293" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="hidden-5" x="353" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="hidden-6" x="413" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="434" y="134" text-anchor="middle" font-size="9" font-weight="600" fill="#555">h&#x2082;</text>
  <rect id="hidden-7" x="473" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="494" y="134" text-anchor="middle" font-size="9" font-weight="600" fill="#555">h&#x2083;</text>
  <rect id="hidden-8" x="533" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <text x="554" y="134" text-anchor="middle" font-size="9" font-weight="600" fill="#555">h&#x2084;</text>
  <rect id="hidden-9" x="593" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="hidden-10" x="653" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="hidden-11" x="713" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>
  <rect id="hidden-12" x="773" y="118" width="42" height="24" rx="4" fill="#DDD4EA" stroke="#B09ED4" stroke-width="1" style="transition: fill 0.25s ease, filter 0.25s ease;"/>

  <!-- ============================================================ -->
  <!-- Heads and Projectors (y=60, h=36) - IDs for JS animation     -->
  <!-- ============================================================ -->
  <rect id="lmhead1" x="53" y="60" width="102" height="36" rx="6" fill="#93A4BD" stroke="#7B8FA8" stroke-width="1.2" style="transition: fill 0.3s ease, filter 0.3s ease;"/>
  <text x="104" y="82" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">LM Head</text>
  <rect id="proj1" x="173" y="60" width="102" height="36" rx="6" fill="#E88080" stroke="#C85555" stroke-width="1.2" style="transition: fill 0.3s ease, filter 0.3s ease;"/>
  <text x="224" y="74" text-anchor="middle" font-size="9" font-weight="600" fill="#fff">Reasoning</text>
  <text x="224" y="86" text-anchor="middle" font-size="9" font-weight="600" fill="#fff">Projector</text>
  <rect id="lmhead2" x="293" y="60" width="102" height="36" rx="6" fill="#93A4BD" stroke="#7B8FA8" stroke-width="1.2" style="transition: fill 0.3s ease, filter 0.3s ease;"/>
  <text x="344" y="82" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">LM Head</text>
  <rect id="proj2" x="413" y="60" width="162" height="36" rx="6" fill="#E88080" stroke="#C85555" stroke-width="1.2" style="transition: fill 0.3s ease, filter 0.3s ease;"/>
  <text x="494" y="74" text-anchor="middle" font-size="9" font-weight="600" fill="#fff">Reasoning</text>
  <text x="494" y="86" text-anchor="middle" font-size="9" font-weight="600" fill="#fff">Projector</text>
  <rect id="lmhead3" x="593" y="60" width="222" height="36" rx="6" fill="#93A4BD" stroke="#7B8FA8" stroke-width="1.2" style="transition: fill 0.3s ease, filter 0.3s ease;"/>
  <text x="704" y="82" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">LM Head</text>

  <!-- ============================================================ -->
  <!-- Outputs (top row)                                             -->
  <!-- ============================================================ -->
  <text x="74" y="28" text-anchor="middle" font-size="10" fill="#555">x&#x2081;</text>
  <text x="134" y="28" text-anchor="middle" font-size="9" fill="#555">&#x27E8;bot&#x27E9;</text>
  <rect x="177" y="14" width="34" height="24" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1"/>
  <text x="194" y="30" text-anchor="middle" font-size="9" fill="#555">e&#x2080;</text>
  <rect x="237" y="14" width="34" height="24" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1"/>
  <text x="254" y="30" text-anchor="middle" font-size="9" fill="#555">e&#x2081;</text>
  <text x="314" y="28" text-anchor="middle" font-size="10" fill="#555">x&#x2096;</text>
  <text x="374" y="28" text-anchor="middle" font-size="9" fill="#555">&#x27E8;bot&#x27E9;</text>
  <rect x="417" y="14" width="34" height="24" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1"/>
  <text x="434" y="30" text-anchor="middle" font-size="9" fill="#555">e&#x2082;</text>
  <rect x="477" y="14" width="34" height="24" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1"/>
  <text x="494" y="30" text-anchor="middle" font-size="9" fill="#555">e&#x2083;</text>
  <rect x="537" y="14" width="34" height="24" rx="4" fill="#F5A3B5" stroke="#D48393" stroke-width="1"/>
  <text x="554" y="30" text-anchor="middle" font-size="9" fill="#555">e&#x2084;</text>
  <!-- Answer box -->
  <rect id="answer-box" x="673" y="10" width="62" height="28" rx="5" fill="#F0F4FF" stroke="#B8C8E0" stroke-width="1.2" style="transition: fill 0.4s ease, filter 0.4s ease;"/>
  <text x="704" y="28" text-anchor="middle" font-size="10" font-weight="600" fill="#555">Answer</text>
  <line x1="704" y1="60" x2="704" y2="40" stroke="#888" stroke-width="1.2" marker-end="url(#arr)"/>

  <!-- ============================================================ -->
  <!-- Glow dot (positioned by JS animation)                         -->
  <!-- ============================================================ -->
  <circle id="arch-glow" r="5" cx="74" cy="212" fill="rgba(40,160,240,0.95)" filter="url(#glow)" opacity="0"/>

  <!-- ============================================================ -->
  <!-- Legend                                                         -->
  <!-- ============================================================ -->
  <rect x="838" y="60" width="14" height="10" rx="2" fill="#F0F4FF" stroke="#B8C8E0" stroke-width="0.8"/>
  <text x="858" y="69" font-size="8.5" fill="#555">Answer</text>
  <rect x="838" y="78" width="14" height="10" rx="2" fill="#DDD4EA" stroke="#B09ED4" stroke-width="0.8"/>
  <text x="858" y="87" font-size="8.5" fill="#555">Hidden state</text>
  <rect x="838" y="96" width="14" height="10" rx="2" fill="#93A4BD" stroke="#7B8FA8" stroke-width="0.8"/>
  <text x="858" y="105" font-size="8.5" fill="#555">LM / LM Head</text>
  <rect x="838" y="114" width="14" height="10" rx="2" fill="#E88080" stroke="#C85555" stroke-width="0.8"/>
  <text x="858" y="123" font-size="8.5" fill="#555">Reasoning Proj.</text>
  <rect x="838" y="138" width="14" height="10" rx="2" fill="#F5E6A3" stroke="#D4C463" stroke-width="0.8"/>
  <text x="858" y="147" font-size="8.5" fill="#555">Discrete embed.</text>
  <rect x="838" y="156" width="14" height="10" rx="2" fill="#F5A3B5" stroke="#D48393" stroke-width="0.8"/>
  <text x="858" y="165" font-size="8.5" fill="#555">Continuous embed.</text>

</svg>
<p class="figure-caption"><strong>Figure 1.</strong> High-level diagram of LiteReason. Discrete sampling (via the LM Head) proceeds as normal until we encounter implicit-thought tags (&#x27E8;bot&#x27E9;). We then switch to latent reasoning mode, using the Reasoning Projector to directly predict continuous token embeddings for a number of forward passes before switching back to discrete sampling.</p>
</div>

## Abstract

Large language models (LLMs) tackle complex tasks by generating long chains of thought or "reasoning traces" that act as latent variables in the generation of an output given a query. A model's ability to generate such traces can be optimized with reinforcement learning (RL) to improve their utility in predicting an answer. This optimization comes at a high computational cost, especially for narrative-related tasks that involve retrieving and processing many tokens. To this end, we propose LiteReason, a latent reasoning method that can be interleaved with standard token sampling and easily combined with RL techniques. LiteReason employs a lightweight Reasoning Projector module, trained to produce continuous latent tokens that help the model "skip" reasoning steps. During RL, the policy model decides when to activate the projector, switching between latent and discrete reasoning as needed. Experimental results on plot hole detection and book chapter generation show that our method outperforms latent reasoning baselines and comes close to matching non-latent RL training, while reducing final reasoning length by 77-92%. Overall, LiteReason guides RL training to a more efficient part of the performance-computation tradeoff curve.

## Method

LiteReason introduces a dual-path generation mechanism. Discrete sampling via the LM Head is performed as normal, selecting a token and passing its corresponding discrete token embedding, until the model generates **implicit thought tags** with the structure `<implicit_thought>#</implicit_thought>`, where `#` is an integer representing the number of steps to take in latent reasoning mode. At each latent step, we pass the final hidden state to the **Reasoning Projector**, a small MLP that directly predicts continuous token embeddings. We can switch between discrete and latent reasoning mode multiple times before producing the final answer with discrete sampling.

After pretraining the Reasoning Projector via SFT (freezing the base LLM), we perform RL fine-tuning of the base model. During RL, only the discrete token sampling steps are considered "actions"; the Reasoning Projector is not updated by policy gradients, though its predictions may change because the discrete token and latent thought predictors share the model body.

Below is a stylized visualization of interleaved discrete and latent generation. Discrete tokens appear as readable text, while `<implicit_thought>` tags trigger latent reasoning steps shown as pulsing dots:

<div class="gen-animation-container" id="gen-animation">
  <span class="gen-label">Generation Preview</span>
  <div class="gen-output" id="gen-output"></div><span class="gen-cursor" id="gen-cursor"></span>
  <div class="gen-controls">
    <button id="gen-play-pause" onclick="toggleAnimation()" title="Play/Pause">&#x23F8;</button>
  </div>
</div>

## Key Results

<div class="stat-cards">
  <div class="stat-card">
    <div class="stat-number">77-92%</div>
    <div class="stat-label">fewer inference tokens</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">50-53%</div>
    <div class="stat-label">fewer training tokens</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">96%</div>
    <div class="stat-label">of RL performance (Flawed Fictions)</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">72%</div>
    <div class="stat-label">of RL performance (NCP)</div>
  </div>
</div>

### Flawed Fictions

<div class="figure-container">
  <div class="chart-wrapper">
    <canvas id="scatter-ff"></canvas>
    <div class="chart-tooltip" id="tooltip-ff"></div>
  </div>
  <p class="figure-caption"><strong>Figure 2.</strong> Accuracy vs. generated tokens on Flawed Fictions. LiteReason achieves near-RL accuracy with dramatically fewer tokens.</p>
</div>

### Next Chapter Prediction

<div class="figure-container">
  <div class="chart-wrapper">
    <canvas id="scatter-ncp"></canvas>
    <div class="chart-tooltip" id="tooltip-ncp"></div>
  </div>
  <p class="figure-caption"><strong>Figure 3.</strong> Contrastive improvement vs. generated tokens on NCP. LiteReason is Pareto-optimal: no other method achieves better performance with fewer tokens.</p>
</div>

### Human Evaluation

<div class="figure-container">
  <div class="chart-wrapper">
    <canvas id="bar-human"></canvas>
    <div class="chart-tooltip" id="tooltip-human"></div>
  </div>
  <div class="chart-legend" id="legend-human"></div>
  <p class="figure-caption"><strong>Figure 4.</strong> Bradley-Terry relative strength across six narrative quality dimensions. LiteReason closely tracks RL-Trained while using far fewer reasoning tokens.</p>
</div>
