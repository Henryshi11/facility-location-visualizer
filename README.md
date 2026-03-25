# Facility Location Visualizer (Cost-Threshold Framework)

## Overview

This project visualizes classical **facility location problems** under a unified **cost-threshold framework**.

Instead of fixing the number of facilities and minimizing cost, we adopt a dual perspective:

> **Minimize the number of facilities subject to a cost constraint.**

This formulation is more aligned with real-world decision-making, where budgets or service requirements are often fixed.

---

## Problem Formulations

### 1. Median-Cost Threshold Model

Minimize the number of facilities such that the **total service cost** does not exceed a given budget:

[
\min |S| \quad \text{s.t. } \sum_{i} w_i , d(i,S) \le B
]

* (S): selected facility set
* (w_i): demand weight of node (i)
* (d(i,S)): distance from node (i) to its nearest facility
* (B): total cost budget

---

### 2. Center-Cost Threshold Model

Minimize the number of facilities such that the **worst-case service cost** is bounded:

[
\min |S| \quad \text{s.t. } \max_{i} ; w_i , d(i,S) \le B
]

This model ensures that no demand point experiences excessively high service cost.

---

### 3. Cost Covering Model

Ensure that **every demand node** is served within a cost limit:

[
\min |S| \quad \text{s.t. } w_i , d(i,S) \le B \quad \forall i
]

This can be interpreted as a **cost-based covering problem**, replacing the traditional distance radius with a cost threshold.

---

## Relationship to Classical Models

Classical facility location problems are typically formulated as:

* **p-median**:
  [
  \min \sum_i w_i d(i,S), \quad \text{s.t. } |S| = p
  ]

* **p-center**:
  [
  \min \max_i w_i d(i,S), \quad \text{s.t. } |S| = p
  ]

* **set covering**:
  [
  \min |S|, \quad \text{s.t. } d(i,S) \le \lambda
  ]

---

### Dual Interpretation

These problems can be viewed from two complementary perspectives:

| Perspective  | Fixed                      | Optimized            |
| ------------ | -------------------------- | -------------------- |
| Classical    | (p) (number of facilities) | cost                 |
| This project | cost threshold (B)         | number of facilities |

This project focuses on the **cost-constrained perspective**, which can be seen as a dual formulation of classical models.

---

## Algorithms

Each model supports two types of algorithms:

### Greedy Heuristic

* Iteratively selects facility locations
* Attempts to satisfy cost constraints quickly
* Efficient for larger instances
* Does not guarantee optimality

---

### Exact Algorithm (Brute Force)

* Enumerates all subsets of nodes
* Guarantees optimal solution
* Exponential time complexity (O(2^n))
* Suitable only for small instances

---

## Visualization Features

* Interactive graph of demand points
* Step-by-step facility selection
* Real-time cost computation
* Comparison between greedy and optimal solutions

---

## Educational Purpose

This project is designed to:

* Provide an intuitive understanding of facility location problems
* Visualize differences between models (median vs center vs covering)
* Demonstrate algorithm behavior and trade-offs
* Support course learning and final project presentation

---

## Key Insight

A central idea of this project is:

> Facility location problems can be reformulated by swapping the role of **constraints** and **objectives**.

* Fixing (p) leads to classical optimization problems
* Fixing cost leads to covering-type problems

This duality provides a deeper understanding of problem structure and algorithm design.

---

## Future Work

* Add facility opening costs
* Budgeted maximum coverage
* Approximation algorithms
* Larger-scale optimization methods
* Interactive cost vs facility trade-off visualization

---

## Author

Henry Shi
University of Lethbridge
Computer Science Major, Mathematics Minor

---
