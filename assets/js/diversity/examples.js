// Generated from the paper's appendix example records (paper/examples/*.json).
// NCP scores are in the paper's units: 100 * (1 - PPL_plan / PPL_no_plan).
window.CD_EXAMPLES = {
 "code": {
  "id": "cobalt:14164",
  "statement": "In Takahashi Kingdom, there is a east-west railroad and N cities along it, numbered 1, 2, 3, ..., N from west to east.\nA company called AtCoder Express possesses M trains, and the train i runs from City L_i to City R_i (it is possible that L_i = R_i).\nTakahashi the king is interested in the following Q matters:\n - The number of the trains that runs strictly within the section from City p_i to City q_i, that is, the number of trains j such that p_i \\leq L_j and R_j \\leq q_i.\nAlthough he is genius, this is too much data to process by himself. Find the answer for each of these Q queries to help him.",
  "constraints": "- N is an integer between 1 and 500 (inclusive).\n - M is an integer between 1 and 200 \\ 000 (inclusive).\n - Q is an integer between 1 and 100 \\ 000 (inclusive).\n - 1 \\leq L_i \\leq R_i \\leq N (1 \\leq i \\leq M)\n - 1 \\leq p_i \\leq q_i \\leq N (1 \\leq i \\leq Q)",
  "tree": "A. Direct query processing with precomputation\n   A1. Precompute all train intervals and store in a list\n   A2. For each query, iterate over all trains and check if L_j >= p_i and R_j <= q_i\nB. Coordinate compression with 2D range queries\n   B1. Map city coordinates to compressed indices\n   B2. Use offline queries with sweep line and segment trees\nC. Offline processing with sorting and event-based queries\n   C1. Sort trains by left endpoint and queries by right endpoint\n   C2. Process events in order using a data structure to count valid trains\nD. Binary search on answer with feasibility checking\n   D1. For each query, binary search on number of trains\n   D2. Check feasibility by counting trains within [p_i, q_i] using interval overlap",
  "groot": [
   {
    "path": "A → A1",
    "text": "Directly process each query by iterating through all trains and checking whether each train's interval [L_j, R_j] lies entirely within the query interval [p_i, q_i]. Since the constraints allow up to 200,000 trains and 100,000 queries, and each train check is O(1), the total complexity is O(M * Q), which may be too slow for worst-case inputs. However, given the small value of N (≤ 500), and that each train interval is bounded by cities, this straightforward approach is feasible only if M and Q are small. But in worst-case M=200,000 and Q=100,000, this would result in 20 billion operations, which is too slow. Thus, this approach is only viable if optimized or if constraints were tighter. However, the sample input (small M and Q) suggests it might work in practice, but it fails in worst-case scalability.",
    "passed": true
   },
   {
    "path": "C → C1",
    "text": "Sort all trains by their left endpoint L_i. For each query, sort queries by their right endpoint q_i. Then process queries in increasing order of q_i, and for each query, add all trains whose left endpoint is ≤ current query's q_i and whose right endpoint is ≥ current query's p_i. Use a data structure (like a balanced BST or sorted list) to maintain active trains and efficiently count those with R_j ≤ q_i. This approach uses offline processing and event-based filtering, reducing the complexity to O((M + Q) log M) with proper implementation. The key insight is that as we process queries in order of increasing q_i, we can add trains incrementally and maintain only those that are relevant, reducing redundant checks.",
    "passed": true
   },
   {
    "path": "B → B1",
    "text": "Apply coordinate compression to map city positions to a smaller index space, then use a 2D range query structure (like a segment tree with coordinate compression) to answer each query. Each train is represented as a range [L_i, R_i], and each query [p_i, q_i] asks for the number of trains fully contained in that range. The feasibility of this approach relies on the fact that N is small (≤ 500), so coordinate compression is trivial. However, building a 2D segment tree for up to 200,000 intervals and 100,000 queries is overkill and complex. Moreover, the range queries here are not standard 2D range sum queries; they are \"count of intervals fully inside a query interval\". This approach is overly complex for the given constraints and does not offer a clear advantage over simpler methods.",
    "passed": false
   },
   {
    "path": "D → D2",
    "text": "For each query, use binary search on the number of trains that lie within [p_i, q_i], but this is not directly applicable because the answer is not a value to be searched over. Instead, feasibility checking would involve counting how many trains satisfy p_i ≤ L_j and R_j ≤ q_i. This is a direct count, not a search. Thus, binary searching over the answer does not make sense here. The feasibility function would be trivial: for a given candidate count, check if that many trains satisfy the condition. But since the count is not a continuous variable and the condition is monotonic in no meaningful way, this approach is invalid and misapplies binary search. Therefore, it fails to produce a correct solution.",
    "passed": true
   }
  ],
  "vs": [
   {
    "p": 0.95,
    "text": "The problem requires counting the number of trains that run entirely within a given interval [p_i, q_i], meaning each train j must satisfy p_i ≤ L_j and R_j ≤ q_i. A straightforward approach is to iterate over each query and, for each train, check whether it lies completely within the query interval. Given that Q can be up to 100,000 and M up to 200,000, a naive O(Q×M) solution would be too slow in the worst case. However, since N is only up to 500, we can consider preprocessing the trains by their left and right endpoints. For each possible left endpoint, we can store all trains with that left endpoint and their right endpoints. Then, for each query [p_i, q_i], we can iterate through all left endpoints from p_i to q_i and count how many trains with that left endpoint have right endpoints ≤ q_i. This reduces the number of checks per query to at most O(N), and with preprocessing, the total complexity becomes O(M×N + Q×N), which is acceptable given the small value of N. The key insight is that instead of checking every train for every query, we group trains by their left endpoint and use the bounded range of N to limit the number of endpoints we need to consider. This approach efficiently handles the constraints due to the small value of N.",
    "passed": false
   },
   {
    "p": 0.1,
    "text": "We can use coordinate compression and offline queries with a sweep line technique. The idea is to treat each train as a segment [L_i, R_i] and each query as a range [p_i, q_i]. We want to count how many segments are fully contained within each query. Instead of checking each train per query, we can process all queries and all segments together. We create events: for each train, we add a \"start\" event at L_i and an \"end\" event at R_i + 1. For each query, we want to count the number of segments that start at or after p_i and end at or before q_i. We can process all events in sorted order and maintain a data structure that tracks active segments. However, since we need to answer queries for specific intervals, we can use a sweep line that goes from left to right and maintains a list of active segments. For each query, we can determine the count by checking the state of the sweep line at position p_i and then advancing to q_i, counting how many segments are active throughout that interval. The challenge is that segments that start before p_i and end after q_i are irrelevant. This method requires sorting events and processing them in order, then using a Fenwick tree or segment tree to maintain counts. However, due to the small value of N, a simpler method is preferred. This approach is more complex and overkill for the constraints, so it is less likely to succeed in practice.",
    "passed": true
   },
   {
    "p": 0.2,
    "text": "We can precompute for each possible interval [l, r] (where 1 ≤ l ≤ r ≤ N) the number of trains that run entirely within it. Since N is at most 500, the total number of intervals is O(N²) = about 125,000, which is manageable. For each interval [l, r], we iterate over all M trains and check if L_i ≥ l and R_i ≤ r. We store the count in a 2D array `count[l][r]`. Then, for each query [p_i, q_i], we simply look up `count[p_i][q_i]`. This approach has a preprocessing time of O(M×N²), which is O(200,000 × 250,000) ≈ 50 billion operations — far too slow. Even though N is small, the square of N leads to a large number of intervals, and M is large, making this approach infeasible. The key flaw is the O(N²) loop over intervals, which scales poorly with N. This method is computationally expensive and not suitable for the given constraints, so it is dismissed.",
    "passed": false
   },
   {
    "p": 0.15,
    "text": "We can use Mo's algorithm to process queries offline by sorting them in a specific order and sweeping through the array. Mo's algorithm is typically used for range queries with updates, but here we are not updating the data — we are counting segments. The idea is to group queries by blocks of the array and process them in a way that minimizes the number of operations. However, the condition for a train to be fully contained in [p_i, q_i] is not additive or monotonic in a way that fits Mo's framework. Additionally, the queries are not over a single array but over segments of trains, and the condition depends on both endpoints. Mo's algorithm would require maintaining a data structure that tracks the number of trains fully inside the current window, and when expanding or contracting the window, we would need to update this count. While possible, the transitions between queries would be complex, and the time complexity would still be O(Q√N), which might be acceptable. However, the structure of the problem — checking full containment — does not naturally lend itself to Mo's algorithm, and there is no clear way to update the count efficiently when moving the window. This approach is not well-suited to the problem and is less likely to succeed than simpler methods.",
    "passed": false
   }
  ],
  "iid_flags": [
   false,
   false,
   false,
   false,
   false,
   false,
   false,
   false
  ],
  "iid_code": "# Read input\nN, M, Q = map(int, input().split())\n\n# Read train segments\ntrains = []\nfor _ in range(M):\n    l, r = map(int, input().split())\n    trains.append((l, r))\n\n# Process queries\nfor _ in range(Q):\n    p, q = map(int, input().split())\n    count = 0\n    for l, r in trains:\n        if p <= l and r <= q:\n            count += 1\n    print(count)",
  "groot_code": "import bisect\n\n# Read input\nN, M, Q = map(int, input().split())\n\ntrains = []\nfor _ in range(M):\n    l, r = map(int, input().split())\n    trains.append((l, r))\n\nqueries = []\nfor i in range(Q):\n    p, q = map(int, input().split())\n    queries.append((p, q, i))\n\n# Sort trains by right endpoint\ntrains.sort(key=lambda x: x[1])\n\n# Sort queries by right endpoint\nqueries.sort(key=lambda x: x[1])\n\n# Initialize active list for L values\nactive_L = []\ntrain_idx = 0\nresults = [0] * Q\n\n# Process queries in increasing order of q\nfor p, q, orig_idx in queries:\n    # Add all trains with R <= q that haven't been added yet\n    while train_idx < M and trains[train_idx][1] <= q:\n        l_val = trains[train_idx][0]\n        bisect.insort(active_L, l_val)\n        train_idx += 1\n    \n    # Count how many in active_L have L >= p\n    pos = bisect.bisect_left(active_L, p)\n    count = len(active_L) - pos\n    results[orig_idx] = count\n\n# Output results in original order\nfor res in results:\n    print(res)"
 },
 "ncp": {
  "arms": {
   "groot": {
    "scores": [
     11.91,
     8.35,
     8.42,
     7.87,
     11.18,
     10.19,
     11.09,
     13.11,
     6.26,
     8.07,
     7.05,
     4.41,
     7.25,
     6.8,
     4.4,
     11.57,
     6.96,
     5.64,
     10.5,
     4.95,
     8.23,
     5.78,
     10.98,
     5.29,
     7.2,
     9.04,
     10.26,
     9.11,
     8.98,
     10.19,
     6.17,
     9.02
    ],
    "best_pct": 13.11
   },
   "vs": {
    "scores": [
     5.87,
     4.84,
     10.4,
     8.04,
     9.07,
     9.12,
     10.67,
     9.64,
     8.05,
     8.1,
     6.46,
     10.75,
     9.8,
     9.02,
     7.66,
     11.57,
     7.24,
     8.66,
     8.74,
     8.0,
     8.83,
     8.07,
     10.31,
     10.23,
     7.09,
     9.7,
     9.54,
     9.35,
     6.95,
     6.82,
     9.11,
     11.05
    ],
    "best_pct": 11.57
   },
   "iid": {
    "scores": [
     8.52,
     7.29,
     6.36,
     6.85,
     4.75,
     6.16,
     8.1,
     5.04,
     5.31,
     5.75,
     6.2,
     7.58,
     7.41,
     9.03,
     7.72,
     6.59,
     3.74,
     6.31,
     7.61,
     8.44,
     7.64,
     5.75,
     7.94,
     5.42,
     4.03,
     3.38,
     6.95,
     7.5,
     6.78,
     6.24,
     8.37,
     6.04
    ],
    "best_pct": 9.03
   }
  }
 }
};
