---
layout: project_page
head_include: diversity/head.html
enable_math: false
project_class: cd-project
title: "Strategically Diverse Sampling for Self-Training"
permalink: /diversity/
description: "Self-training on strategically diverse samples (GROOT and Verbalized Sampling) beats IID self-training, even with 16x more samples, only incorrect traces, or a 235B teacher."
og_image: https://alexgurung.me/assets/img/diversity/groot-pipeline-poster.jpg
authors:
  - name: Alexander Gurung
    affiliation: "1"
    url: "https://Alex-Gurung.github.io"
  - name: Esmeralda S. Whitammer
    affiliation: "1,2"
  - name: Mirella Lapata
    affiliation: "1"
affiliations:
  - id: "1"
    name: "University of Edinburgh"
  - id: "2"
    name: "CIFAR Fellow"
links:
  - text: arXiv
    url: "https://arxiv.org/abs/2609.31571"
    icon: "fas fa-file-alt"
bibtex: |
  @misc{gurung2026strategicallydiverse,
    title  = {Strategically Diverse Sampling for Self-Training},
    author = {Alexander Gurung and Esmeralda S. Whitammer and Mirella Lapata},
    year   = {2026},
    eprint = {2609.31571},
    archivePrefix = {arXiv},
    primaryClass = {cs.CL},
    url    = {https://arxiv.org/abs/2609.31571}
  }
---

{% include diversity/body.html %}
