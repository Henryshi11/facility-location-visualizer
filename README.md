# Facility Location Visualizer

A course-focused visualizer for reviewing and practicing core facility location ideas from class.

This project was built as a final project for a facility location course.  
Its main goal is not to include as many heuristics as possible, but to help me **understand, review, and visually trace the algorithms and models emphasized in the lecture notes**.

---

## Project Goal

Instead of treating facility location only as formulas or pseudocode, this project turns the main ideas into a step-by-step visual tool.

The project focuses on:

- understanding the difference between **p-median**, **p-center**, and **covering**
- visualizing how a solution evolves over time
- reviewing the relationship between **model definition**, **objective function**, and **algorithm behavior**
- emphasizing the course material, especially **p-center feasibility testing** and **parametric search on path networks**

---

## Course Alignment

The lecture notes describe three main facility location models:

- **p-Median**: minimize the total weighted assignment cost
- **p-Center**: minimize the maximum weighted assignment cost
- **Covering**: given a threshold λ, minimize the number of facilities needed to cover all demand points

For the p-center problem on paths, the notes also emphasize:

- the **λ-feasibility test**
- **parametric search**
- path-based reasoning using weighted intervals

This project follows that structure.

---

## Supported Models

### 1. p-Median

Given a fixed number of facilities `p`, choose `p` locations to minimize the total weighted service cost:

\[
\min_{|F| = p} \sum_i w_i d(i, F)
\]

This is the **minisum** version of facility location.

### 2. p-Center

Given a fixed number of facilities `p`, choose `p` locations to minimize the worst weighted service cost:

\[
\min_{|F| = p} \max_i w_i d(i, F)
\]

This is the **minimax** version of facility location.

### 3. Covering

Given a service threshold `λ`, open as few facilities as possible so that every demand point is covered:

\[
\forall i,\; w_i d(i, F) \le \lambda
\]

The objective is:

\[
\min |F|
\]

---

## Implemented Algorithms

### p-Median
- **Exact Brute Force**
  - Used as a small-instance baseline
  - Tries every facility subset of size `p`

### p-Center
- **λ-Feasibility Test**
  - Builds coverage intervals on a path
  - Places facilities greedily at interval right endpoints
  - Checks whether the current λ can be satisfied with at most `p` facilities

- **Parametric Search**
  - Generates candidate λ values from pairs of weighted vertices
  - Uses repeated feasibility tests to find the smallest feasible λ

- **Exact Brute Force**
  - Included as a small-instance baseline for comparison

### Covering
- **Exact Brute Force**
  - Used as a baseline for small examples


## Visualization Design

The visualizer shows:

- graph nodes and edge lengths
- node weights
- selected facilities
- assignments from customers to facilities
- interval coverage structure for feasibility testing
- step-by-step explanations
- metric changes such as total cost, max cost, λ, or facility count

For the p-center feasibility test and parametric search views, the intervals \( I_i(\lambda) \) are displayed above the path, and facility placements are shown directly on the path.

---

## Why Path Graphs Are Used

The lecture notes on parametric search describe the weighted p-center problem on a **path network / real line**, where each demand point induces an interval for a given λ.

Because of that, this project emphasizes **path-style examples** so the course algorithms can be visualized clearly and faithfully.

---

## Current Scope

This project currently focuses on:

- small graph examples
- visual understanding
- path-based p-center ideas
- baseline exact search for comparison

---

## Possible Future Extensions

Future extensions could include:

- node search for the 1-center on trees
- centroid-based pruning ideas
- prune-and-search demonstrations
- integer programming formulations
- larger input import / export

These are intentionally left outside the current version so the project remains tightly aligned with the course material.

---

## Tech Stack

- React
- Vite
- HTML Canvas

---

## Running the Project

Install dependencies:

```bash
npm install

Start development server:

```bash
npm run dev


Build for production:

```bash
npm run build

Preview production build:

```bash
npm run preview