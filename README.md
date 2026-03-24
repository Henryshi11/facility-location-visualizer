# Facility Location Visualizer

A personal project for practicing and reviewing facility location algorithms, built as a final project for my course.

This tool focuses on visualizing how different algorithms behave on graphs, making it easier to understand their differences through step-by-step execution.

---

## Overview

This project is designed as a hands-on way to revisit and reinforce concepts from facility location theory.

Instead of only working with formulas or pseudocode, the goal is to:
- see how algorithms evolve step by step
- compare different strategies visually
- understand why certain methods succeed or fail

The visual interface makes it easier to build intuition about algorithm behavior.

---

## Supported Models

### p-Median
Minimize the total distance from nodes to their nearest selected facility.

### p-Center
Minimize the maximum distance to the nearest facility.

### Set Covering
Select facilities so that all nodes are covered within a given radius.

---

## Implemented Algorithms

### p-Median
- Greedy Addition
- Exact Brute Force
- Local Swap

### p-Center
- Greedy Addition
- Farthest First
- Exact Brute Force

### Set Covering
- Greedy Cover
- Exact Brute Force

---

## Features

- step-by-step algorithm simulation
- interactive graph visualization (Canvas-based)
- snapshot playback (play / pause / step)
- random graph generation (path graphs)
- example graph selection
- scoreboard and explanation panel
- JSON view for debugging and inspection
- S-shaped layout for long path graphs

---

## Distance Model

Distances are computed using **graph shortest paths**, not geometric (straight-line) distance.

This means:
- nodes are connected through edges
- distances follow the graph structure
- visual layout does not affect actual distance calculations

---

## Key Idea

Different algorithms can produce very different results on the same problem.

For example:
- Greedy methods may return suboptimal solutions
- Exact methods can verify the true optimum (for small instances)

This project makes those differences visible.

