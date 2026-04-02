# Facility Location Visualizer

A visual and interactive tool for understanding core facility location algorithms.
Built for coursework review and final project demonstration.

---

## Features

* Step-by-step algorithm visualization
* Supports p-Median, p-Center, and Covering
* Snapshot-based simulation system
* Random graph generation
* Dark / Neumorphism theme

---

## Supported Models

### 1. p-Median

Choose (p) facilities to minimize total weighted cost:

$$
\min_{|F| = p} \sum_i w_i d(i, F)
$$

---

### 2. p-Center

Choose (p) facilities to minimize the worst weighted cost:

$$
\min_{|F| = p} \max_i w_i d(i, F)
$$

---

### 3. Covering

Given a threshold (\lambda), open as few facilities as possible such that:

$$
w_i d(i, F) \le \lambda \quad \forall i
$$

$$
\min |F|
$$

---

## Algorithms Implemented

### p-Median

* Exact brute force

### p-Center

* λ-Feasibility Test
* Parametric Search (discrete λ)
* Exact brute force

### Covering

* Exact brute force

---

## Notes

* All objectives use **weighted cost**:
  $( w_i \cdot d(i, F) )$

* Designed for **small graphs only** (exact algorithms)

* Focus:

  * understanding algorithms
  * visual intuition
  * course review

---

## Project Structure

```
src/
  algorithms/        # core algorithms
  config/            # models and algorithms config
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

## Purpose

This project is intended as:

* a visual aid for learning facility location algorithms
* a personal course review tool
* a final project demonstrating algorithm behavior
