# Facility Location Visualizer (p-Center)

An interactive visualization tool for understanding the **p-Center problem** using:

- Discrete node-restricted model
- Parametric search
- Interval-based feasibility test

Designed for algorithm learning, coursework demonstration, and step-by-step explanation.

---

#  Problem Definition

Given:

- A set of nodes $V$
- Each node $i$ has a weight $w_i$
- A path metric distance $d(i,j)$
- A number of facilities $p$

We want to choose a set of facilities $F \subseteq V$, $|F| = p$, such that:

$$
\min_{|F| = p} \max_{i \in V} \; w_i \cdot d(i, F)
$$

where:

$$
d(i, F) = \min_{j \in F} d(i, j)
$$

---

#  Core Idea

We solve p-Center using:

### 1. Parametric Search

Convert optimization into decision:

> Given $\lambda$, can we cover all nodes using at most $p$ facilities?

---

### 2. Discrete Feasibility Transformation

Each node $i$ becomes an interval:

$$
\left[x_i - \frac{\lambda}{w_i}, \; x_i + \frac{\lambda}{w_i} \right]
$$

This means:

> A facility must be placed inside this interval to cover node $i$

---

### 3. Critical Interval Reduction

Remove redundant intervals:

- If one interval contains another, the larger one is removed

After this:

- Left endpoints are increasing
- Right endpoints are increasing

This ensures a valid greedy structure.

---

### 4. Discrete Node-Restricted Model

Unlike the continuous version:

> Facilities can only be placed on nodes

So each interval corresponds to:

$$
[L_i, R_i]
$$

which represents the **range of feasible node indices**

---

### 5. Intersection-Based Feasibility Test (O(n))

We scan intervals from left to right:

Maintain:

$$
\text{currentL} = \max L_i, \quad \text{currentR} = \min R_i
$$

If:

$$
\text{currentL} \le \text{currentR}
$$

→ intervals still overlap

Otherwise:

- Place a facility at **currentR (rightmost feasible node)**
- Reset intersection

---

### Key Insight

> A facility is placed only when the intersection becomes empty.

This guarantees:

- Correctness
- Minimal number of facilities

---

# Why Choose the Rightmost Node?

We always choose:

$$
\text{facility} = \text{rightmost feasible node}
$$

Reason:

- Maximizes coverage to the right
- Matches optimal greedy strategy on a path
- Equivalent to classic interval stabbing

---

# Algorithm Pipeline

1. Generate candidate values:

$$
\lambda = w_i \cdot d(i,j)
$$

2. Sort and deduplicate candidates

3. Binary search over candidates

4. For each $\lambda$:

   - Build intervals
   - Reduce to critical intervals
   - Run feasibility test

---

# ⏱️ Complexity Analysis

### Feasibility Test

- Each interval processed once
- Only boundary updates

$$
O(n)
$$

---

### Parametric Search

- Number of candidates: $O(n^2)$
- Binary search: $O(\log n)$
- Each test: $O(n)$

$$
O(n \log n) \text{ (search phase)}
$$

---

### Total Complexity

Including candidate generation:

$$
O(n^2 \log n)
$$

---

# Visualization Features

- Step-by-step feasibility simulation
- Interval visualization on path
- Binary search tracking (low / mid / high)
- Facility placement animation
- Coverage explanation

---

#  Key Insight Summary

- p-Center can be solved via parametric search
- Feasibility reduces to interval covering
- Discrete version requires node-restricted placement
- Intersection-based greedy is both correct and efficient

---

## Run

```bash
npm install
npm run dev
```

