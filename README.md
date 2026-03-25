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

Given a fixed number of facilities \( p \), minimize the **total weighted assignment cost**:

\[
\min_{|S|=p} \sum_i w_i d(i,S)
\]

This is the classical p-median formulation.

---

### p-Center

Given a fixed number of facilities \( p \), minimize the **worst weighted assignment cost**:

\[
\min_{|S|=p} \max_i w_i d(i,S)
\]

This is different from p-median: the goal is not to minimize the total, but to minimize the worst case.

---

### Cost Covering

Given a cost threshold \( \lambda \), find the **minimum number of facilities** such that every node satisfies

\[
w_i d(i,S) \le \lambda
\]

Equivalently:

\[
\min |S| \quad \text{s.t. } w_i d(i,S) \le \lambda,\ \forall i
\]

This is the cost-threshold version of covering used in this project.

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

### Cost Covering

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

Different models optimize different objectives:

- p-median minimizes the total weighted cost
- p-center minimizes the worst weighted cost
- cost covering fixes a threshold and minimizes the number of facilities

This project makes those differences visible through animation and side-by-side reasoning.

---

## Educational Purpose

This project serves as:

- a visual learning tool for facility location algorithms
- a review project for course topics
- a final project for understanding the differences between classical models
- a way to build intuition about greedy vs exact methods

