# Facility Location Visualizer

A visual and interactive tool for understanding core facility location algorithms.
Built for coursework review and final project demonstration.

---

## Features

* Step-by-step algorithm visualization
* Supports **p-Median**, **p-Center**, and **Cost Covering**
* Snapshot-based simulation system
* Random graph generation
* Dark / Neumorphism themes
* Clear explanation of **algorithm decisions and search steps**

---

## Supported Models

### 1. p-Median

Choose ( p ) facilities to minimize total weighted cost:

$$
\min_{|F| = p} \sum_i w_i , d(i, F)
$$

---

### 2. p-Center

Choose ( p ) facilities to minimize the worst weighted cost:

$$
\min_{|F| = p} \max_i w_i , d(i, F)
$$

---

### 3. Cost Covering

Given a threshold ( \lambda ), open as few facilities as possible such that:

$$
w_i , d(i, F) \le \lambda \quad \forall i
$$

$$
\min |F|
$$

---

## Algorithms Implemented

### p-Median

* Exact brute-force (baseline, optimal for small graphs)

---

### p-Center

* **λ-Feasibility Test (Greedy, path-based)**

  * Transforms each demand into an interval using $( \lambda / w_i )$
  * Uses **left-to-right greedy covering** to test feasibility
  * Represents the decision version of p-Center

* **Parametric Search (Binary Search on λ)**

  * Searches over discrete candidate values of $( \lambda )$
  * Uses feasibility test as a decision oracle
  * Exploits monotonicity:

    * feasible → search smaller λ
    * infeasible → search larger λ

* Exact brute-force (verification baseline)

---

### Cost Covering

* Exact brute-force (minimum facility set under λ)

---

## Key Ideas

* All objectives use **weighted cost**:
  $$[
  w_i \cdot d(i, F)
  ]$$

* p-Center is solved via:

  * **decision problem (feasibility test)**
  * * **parametric search (binary search on λ)**

* On path graphs:

  * feasibility reduces to **interval covering**
  * solved using a **greedy strategy**

---



## Project Structure

```
src/
  algorithms/        # core algorithms (p-median, p-center, covering)
  config/            # model and algorithm configuration
  core/              # snapshot system
  data/              # example graphs
  features/          # simulation builder
  graph/             # graph generation
  render/            # canvas + themes
```

---

## Run

```bash
npm install
npm run dev
```

---


* a personal course review tool
* a demonstration of **optimization → decision → search** workflow
