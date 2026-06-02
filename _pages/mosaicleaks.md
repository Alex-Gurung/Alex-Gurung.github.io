---
layout: project_page
project_class: mosaic-project
title: "MosaicLeaks: Privacy Risks in Querying-in-the-Open for Deep Research Agents"
permalink: /mosaicleaks/
sitemap: false
authors:
  - name: Alexander Gurung
    affiliation: "2,&dagger;"
    url: "https://Alex-Gurung.github.io"
  - name: Spandana Gella
    affiliation: "1,4,*"
  - name: Alexandre Drouin
    affiliation: "1,3,6,*"
  - name: Issam H. Laradji
    affiliation: "1,5"
  - name: Perouz Taslakian
    affiliation: "1,3,4"
  - name: Rafael Pardinas
    affiliation: "1"
affiliations:
  - id: "1"
    name: "ServiceNow AI Research"
  - id: "2"
    name: "University of Edinburgh"
  - id: "3"
    name: "Mila - Quebec AI Institute"
  - id: "4"
    name: "McGill University"
  - id: "5"
    name: "University of British Columbia"
  - id: "6"
    name: "Universit&eacute; Laval"
author_notes:
  - "&dagger; Work done at ServiceNow AI Research"
  - "* Equal contribution"
links:
  - text: arXiv
    url: "https://arxiv.org/abs/2605.30727"
    icon: "fas fa-file-alt"
bibtex: |
  @misc{gurung2026mosaicleaks,
    title  = {MosaicLeaks: Privacy Risks in Querying-in-the-Open for Deep Research Agents},
    author = {Alexander Gurung and Spandana Gella and Alexandre Drouin and Issam H. Laradji and Perouz Taslakian and Rafael Pardinas},
    year   = {2026},
    eprint = {2605.30727},
    archivePrefix = {arXiv},
    url    = {https://arxiv.org/abs/2605.30727}
  }
---

<div class="mosaic-page" markdown="1">

## TL;DR

<div class="tldr">
<strong>MosaicLeaks</strong> studies a core privacy risk in deep research agents: external web queries can leak information from private local documents, especially when individually harmless queries become revealing in aggregate. <strong>Privacy-Aware Deep Research (PA-DR)</strong> trains the agent with situational task rewards plus a learned privacy reward, improving strict chain success from 48.7% to 58.7% while reducing answer/full-information leakage from 34.0% to 9.9%.
</div>

## Privacy Leakage in Deep-Research Agents

Deep research agents increasingly combine sensitive enterprise data with external tools like web search and cloud APIs. Their value comes from synthesizing private and public sources, but monitored external services can see the agent's queries, and those queries may leak information from local context.

This risk is compounded by the <em>mosaic effect</em>, where individually harmless fragments become revealing in aggregate. MosaicLeaks treats web queries as the leakage channel: an adversary observes only the cumulative web queries and tries to infer private enterprise information.

We measure leakage in three ways. <strong>Intent leakage</strong> asks whether the adversary can predict the research questions. <strong>Answer leakage</strong> asks whether it can answer supplied private questions about enterprise documents. <strong>Full-information leakage</strong> asks whether it can independently state true private claims without seeing those questions.

<div class="mosaic-figure mosaic-narrow mosaic-compact-figure">
  <img src="/assets/img/mosaicleaks/mosaic-effect.png" alt="Diagram showing how three visible web queries can let an adversary infer intent leakage, answer leakage, and full-information leakage." loading="lazy">
  <div class="mosaic-figure-caption">
    Example of how the Mosaic Effect contributes to MosaicLeaks's measurements of privacy leakage from a research agent's web queries. We evaluate leakage across three axes: <strong>Intent Leakage</strong> (predict the research questions), <strong>Answer Leakage</strong> (answer given questions about enterprise documents), and <strong>Full-Information Leakage</strong> (predict verifiably true claims about enterprise documents). In this example, the agent first searches twice for information related to Lee's Market's 2020 traffic growth, leaking its research intent. The third query switches to attempting to answer a new question, based on the answer to the previous one. Although these queries look benign alone, an adversary could infer compositional information when seen together. By deducing that 15% is the answer the agent was looking for in the first two queries, the adversary can make the claim that Lee's online traffic grew 15% in 2020.
  </div>
</div>

## Building MosaicLeaks

MosaicLeaks contains 1,001 multi-hop research chains over local enterprise documents and a controlled web corpus. The goal is to create tasks with a high likelihood of inducing privacy leakage from enterprise documents, but that can still be solved without leaking.

Each chain interleaves local and web sub-questions. The answer to one sub-question becomes a bridge entity in the next, so the agent must retrieve local information before it can form the next useful web query. Local documents come from DRBench-style enterprise tasks, and web documents come from BrowseComp-Plus. The final split contains 559 training chains, 98 validation chains, and 344 held-out-company test chains.

<div class="mosaic-build-grid" aria-label="MosaicLeaks data construction pipeline">
  <div class="mosaic-step-card">
    <span class="mosaic-step-num">1</span>
    <h3>Seed private facts</h3>
    <p>Generate private question-answer pairs from enterprise documents, such as internal metrics, dates, dollar amounts, and named entities.</p>
  </div>
  <div class="mosaic-step-card">
    <span class="mosaic-step-num">2</span>
    <h3>Bridge documents</h3>
    <p>Use the previous answer to retrieve a new document and generate the next question, creating explicit local-web dependencies.</p>
  </div>
  <div class="mosaic-step-card">
    <span class="mosaic-step-num">3</span>
    <h3>Validate chains</h3>
    <p>Check answerability, retrievability, source order, and whether the previous answer is necessary rather than decorative.</p>
  </div>
</div>

<div class="mosaic-example-list">
  <div class="mosaic-chain-card">
    <h3>MediConn cloud migration chain</h3>
    <div class="mosaic-chain-hop"><span class="mosaic-source-pill is-local">L</span><span>What percent of MediConn's on-premise infrastructure had migrated to cloud by Q1 2025?</span><strong>70%</strong></div>
    <div class="mosaic-chain-hop"><span class="mosaic-source-pill is-local">L</span><span>By what month was the 70% migration milestone complete?</span><strong>January</strong></div>
    <div class="mosaic-chain-hop"><span class="mosaic-source-pill is-web">W</span><span>Which tech company disclosed a massive nation-state attack on its systems in January 2024?</span><strong>Microsoft</strong></div>
    <p>The final web hop can be answered from public evidence, but the path to it depends on private local facts. A query that carries forward "MediConn", "70%", and "January" gives the adversary enough context to recover internal information.</p>
  </div>
</div>

## Agent Harness

We use a simplified agent harness adapted from DRBench. The model answers each sub-question with a short answer and justification, allowing us to evaluate each hop individually with normalized string matching.

At each iteration, the model can use four tools. <strong>Plan</strong> produces local and web search queries, which are executed and returned as document cards. <strong>Choose</strong> selects which retrieved documents to read. <strong>Read</strong> attempts to answer the current hop from each selected document in parallel. <strong>Resolve</strong> decides whether to answer, read more documents, or plan another search.

<div class="mosaic-chip-row" aria-label="Research agent stages">
  <span class="mosaic-chip">Plan</span>
  <span class="mosaic-chip">Execute retrieval</span>
  <span class="mosaic-chip">Choose</span>
  <span class="mosaic-chip">Read</span>
  <span class="mosaic-chip">Resolve</span>
</div>

<div class="mosaic-figure">
  <img src="/assets/img/mosaicleaks/example-rollout-timeline.png" alt="Timeline of a MosaicLeaks rollout showing repeated planning, retrieval, choosing, reading, and resolving steps across local and web hops." loading="lazy">
  <div class="mosaic-figure-caption">
    Example MosaicLeaks agent rollout. Each row shows one hop in a dependent multi-hop chain, labeled by source document type, web (<strong>W</strong>) or local (<strong>L</strong>), and the accepted answer. The colored blocks indicate the wall-clock duration of each stage: planning retrieval queries, executing retrieval, choosing documents, reading selected documents in parallel, and resolving whether to answer or continue.
  </div>
</div>

## Prompting Encourages Local Queries, But Does Not Solve Privacy Leakage

Previous work often proposes a naive intervention: simply add privacy-aware instructions to the Plan prompt. We test a prompt that discourages web queries that may leak local information, and evaluate its effect on performance, leakage, and query behavior.

The prompt helps slightly for some models, but its effect is inconsistent and significant leakage remains. It also often has a negative effect on task performance. For Qwen3-4B, the prompt lowers answer/full-information leakage from 34.0% to 25.5%, but strict chain success drops from 48.7% to 44.5%. The primary behavioral change appears to be fewer web queries, not consistently safer query construction.

<div class="mosaic-figure">
  <img src="/assets/img/mosaicleaks/privacy-prompt-accuracy-leakage.png" alt="Bar charts comparing strict chain success and privacy leakage with and without privacy prompting across evaluated models." loading="lazy">
  <div class="mosaic-figure-caption">
    Strict chain success and privacy leakage with and without a prompt discouraging web queries that may leak local information. The prompt decreases leakage slightly for some models, but substantial leakage remains.
  </div>
</div>

## Privacy Aware-Deep Research (PA-DR) via _Situational_ Reinforcement Learning

We also investigate training exclusively for task performance. This improves strict chain success from 48.7% to 59.3%, but worsens answer/full-information leakage from 34.0% to 51.7%, as the model learns to include more information in its web queries.

To train long agent trajectories, we use <em>situational</em> rewards. Instead of giving every trainable call in a rollout the same outcome-level advantage, we group calls by hop, stage, and situation, then reward the behavior that is locally well defined. For example, a Plan call is rewarded for searching the correct source and retrieving the gold document; if the gold document is already available, not searching receives the maximum reward. This improves both outcome-based performance and training efficiency.

PA-DR adds a learned privacy reward on top of the situational task reward. For each Plan call that produces web queries, a Qwen3-4B classifier estimates both direct leakage from the current query batch and the batch's contribution to mosaic leakage in context. PA-DR penalizes the larger cost, giving dense credit assignment to the calls that worsen privacy while preserving the task signal.

<div class="mosaic-figure">
  <video controls playsinline preload="metadata" poster="/assets/img/mosaicleaks/training-tradeoff-poster.png">
    <source src="/assets/video/mosaicleaks/training-tradeoff.mp4" type="video/mp4">
  </video>
</div>

<div class="mosaic-results" aria-label="Training result comparison">
  <div class="mosaic-result is-base">
    <div class="mosaic-result-name">Base Qwen3 4B</div>
    <div class="mosaic-result-metrics">
      <div class="mosaic-result-metric">
        <strong>48.7%</strong>
        <span>strict chain success</span>
      </div>
      <div class="mosaic-result-metric">
        <strong>34.0%</strong>
        <span>privacy leakage</span>
      </div>
    </div>
  </div>
  <div class="mosaic-result is-task">
    <div class="mosaic-result-name">Task reward</div>
    <div class="mosaic-result-metrics">
      <div class="mosaic-result-metric">
        <strong>59.3%</strong>
        <span>strict chain success</span>
      </div>
      <div class="mosaic-result-metric">
        <strong>51.7%</strong>
        <span>privacy leakage</span>
      </div>
    </div>
  </div>
  <div class="mosaic-result is-padr">
    <div class="mosaic-result-name">Task + PA-DR reward</div>
    <div class="mosaic-result-metrics">
      <div class="mosaic-result-metric">
        <strong>58.7%</strong>
        <span>strict chain success</span>
      </div>
      <div class="mosaic-result-metric">
        <strong>9.9%</strong>
        <span>privacy leakage</span>
      </div>
    </div>
  </div>
</div>

## Situational Rewards Provide Dense Credit

Outcome-only RL scores each rollout once. After advantage normalization, every trainable call in that rollout receives the same advantage, so a successful rollout can reinforce a leaky or locally wrong call while a failed rollout can penalize a locally useful call.

Situational rewards avoid this by comparing matching calls. The reward depends on the stage and the information available in the input, without requiring a separate value model or aligned step indices across rollouts. We train Plan and Choose stages because their desired behavior can be verified directly: Plan should search the right source or stop searching when enough evidence is already available, and Choose should select the gold document when it is visible.

<div class="mosaic-figure">
  <video controls playsinline preload="metadata" poster="/assets/img/mosaicleaks/situational-reward-poster.png" aria-label="Animation explaining rollout-level outcome advantages, situation-specific reward groups, and PA-DR privacy penalties across MosaicLeaks rollouts.">
    <source src="/assets/video/mosaicleaks/situational-reward.mp4" type="video/mp4">
  </video>
</div>

<table class="mosaic-table">
  <thead>
    <tr>
      <th>Training reward</th>
      <th>Generated samples <span class="mosaic-direction">&darr; better</span></th>
      <th>Strict success <span class="mosaic-direction">&uarr; better</span></th>
      <th>Privacy leakage <span class="mosaic-direction">&darr; better</span></th>
      <th>Samples to 55% success <span class="mosaic-direction">&darr; better</span></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Training reward">Outcome reward</td>
      <td data-label="Generated samples">963k</td>
      <td data-label="Strict success">55.4%</td>
      <td data-label="Privacy leakage">49.0%</td>
      <td data-label="Samples to 55% success">963k</td>
    </tr>
    <tr>
      <td data-label="Training reward">Situational task reward</td>
      <td data-label="Generated samples">842k</td>
      <td data-label="Strict success"><strong>59.3%</strong></td>
      <td data-label="Privacy leakage">51.7%</td>
      <td data-label="Samples to 55% success"><strong>146k</strong></td>
    </tr>
    <tr>
      <td data-label="Training reward">Task + PA-DR reward</td>
      <td data-label="Generated samples"><strong>706k</strong></td>
      <td data-label="Strict success">58.7%</td>
      <td data-label="Privacy leakage"><strong>9.9%</strong></td>
      <td data-label="Samples to 55% success">183k</td>
    </tr>
  </tbody>
</table>

<div class="mosaic-table-caption">
  Training-efficiency summary. The final column reports how many generated samples each method needs to reach roughly 55% strict chain success. Lower values mean the method reaches the same task-performance target with fewer generated rollouts.
</div>

<div class="mosaic-figure">
  <img src="/assets/img/mosaicleaks/training-sample-efficiency.png" alt="Plots showing strict chain success and privacy leakage over generated training samples for outcome, task, and PA-DR rewards." loading="lazy">
  <div class="mosaic-figure-caption">
    Situational rewards reach outcome-reward-level task success using roughly 5-6x fewer generated samples. PA-DR keeps the sample-efficiency benefit while sharply reducing leakage.
  </div>
</div>

## Conclusion

MosaicLeaks addresses the lack of existing resources to study mosaic privacy leakage of enterprise information in deep research settings. We construct a multi-hop deep research dataset with strong inter-document dependencies across local and web documents, and analyze the privacy leakage of several models. Prompting-based intervention has limited effect, and training an agent exclusively for task performance worsens privacy leakage. PA-DR instead trains privacy as part of the agent objective, producing a significantly more privacy-aware model without sacrificing task performance.

</div>
