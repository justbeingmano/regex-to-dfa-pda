/***********************
 * GLOBALS
 ***********************/
let stateCount = 0;
let currentNFA = null;
let currentDFA = null;
let currentPDA = null;
let cy = null;

/***********************
 * STATE GENERATOR
 ***********************/
function newState() {
  return `q${stateCount++}`;
}

/***********************
 * MAIN CONVERT (Regex → NFA)
 ***********************/
function convert() {
  stateCount = 0;
  const regex = document.getElementById("regexInput").value;
  if (!regex) return;

  const tokens = tokenize(regex);
  const withConcat = addConcat(tokens);
  const postfix = toPostfix(withConcat);

  currentNFA = postfixToNFA(postfix);
  drawNFA(currentNFA);
}

/***********************
 * TOKENIZE
 ***********************/
function tokenize(regex) {
  return regex.split("");
}

/***********************
 * ADD CONCATENATION (.)
 ***********************/
function addConcat(tokens) {
  const result = [];
  const symbols = /[a-z0-9]/;

  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    const next = tokens[i + 1];
    result.push(curr);

    if (
      next &&
      (symbols.test(curr) || curr === ")" || curr === "*") &&
      (symbols.test(next) || next === "(")
    ) {
      result.push(".");
    }
  }
  return result;
}

/***********************
 * INFIX → POSTFIX
 ***********************/
function toPostfix(tokens) {
  const output = [];
  const stack = [];
  const prec = { "|": 1, ".": 2, "*": 3 };

  tokens.forEach((token) => {
    if (/[a-z0-9]/.test(token)) {
      output.push(token);
    } else if (token === "(") {
      stack.push(token);
    } else if (token === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") {
        output.push(stack.pop());
      }
      stack.pop();
    } else {
      while (stack.length && prec[stack[stack.length - 1]] >= prec[token]) {
        output.push(stack.pop());
      }
      stack.push(token);
    }
  });

  while (stack.length) output.push(stack.pop());
  return output;
}

/***********************
 * POSTFIX → NFA (Thompson)
 ***********************/
function postfixToNFA(postfix) {
  const stack = [];

  postfix.forEach((token) => {
    if (/[a-z0-9]/.test(token)) {
      const start = newState();
      const end = newState();
      stack.push({
        start,
        end,
        transitions: [{ from: start, to: end, symbol: token }],
      });
    } else if (token === ".") {
      const b = stack.pop();
      const a = stack.pop();
      a.transitions.push({ from: a.end, to: b.start, symbol: "ε" });
      stack.push({
        start: a.start,
        end: b.end,
        transitions: [...a.transitions, ...b.transitions],
      });
    } else if (token === "|") {
      const b = stack.pop();
      const a = stack.pop();
      const start = newState();
      const end = newState();
      stack.push({
        start,
        end,
        transitions: [
          { from: start, to: a.start, symbol: "ε" },
          { from: start, to: b.start, symbol: "ε" },
          { from: a.end, to: end, symbol: "ε" },
          { from: b.end, to: end, symbol: "ε" },
          ...a.transitions,
          ...b.transitions,
        ],
      });
    } else if (token === "*") {
      const a = stack.pop();
      const start = newState();
      const end = newState();
      stack.push({
        start,
        end,
        transitions: [
          { from: start, to: a.start, symbol: "ε" },
          { from: start, to: end, symbol: "ε" },
          { from: a.end, to: a.start, symbol: "ε" },
          { from: a.end, to: end, symbol: "ε" },
          ...a.transitions,
        ],
      });
    }
  });

  return stack.pop();
}

/***********************
 * NFA → DFA
 ***********************/
function epsilonClosure(states, transitions) {
  const closure = new Set(states);
  const stack = [...states];

  while (stack.length) {
    const s = stack.pop();
    transitions.forEach((t) => {
      if (t.from === s && t.symbol === "ε" && !closure.has(t.to)) {
        closure.add(t.to);
        stack.push(t.to);
      }
    });
  }
  return closure;
}

function move(states, symbol, transitions) {
  const result = new Set();
  states.forEach((s) => {
    transitions.forEach((t) => {
      if (t.from === s && t.symbol === symbol) {
        result.add(t.to);
      }
    });
  });
  return result;
}

function setName(set) {
  return `{${[...set].sort().join(",")}}`;
}

function convertToDFA() {
  if (!currentNFA) return;

  const alphabet = [
    ...new Set(
      currentNFA.transitions.map((t) => t.symbol).filter((s) => s !== "ε")
    ),
  ];

  const dfaStates = [];
  const dfaTransitions = [];
  const unmarked = [];

  const startSet = epsilonClosure([currentNFA.start], currentNFA.transitions);

  dfaStates.push(setName(startSet));
  unmarked.push(startSet);

  while (unmarked.length) {
    const T = unmarked.pop();
    const Tname = setName(T);

    alphabet.forEach((symbol) => {
      const U = epsilonClosure(
        move(T, symbol, currentNFA.transitions),
        currentNFA.transitions
      );

      if (U.size === 0) return;

      const Uname = setName(U);
      dfaTransitions.push({ from: Tname, to: Uname, symbol });

      if (!dfaStates.includes(Uname)) {
        dfaStates.push(Uname);
        unmarked.push(U);
      }
    });
  }

  const accept = dfaStates.filter((s) => s.includes(currentNFA.end));

  currentDFA = {
    states: dfaStates,
    start: setName(startSet),
    transitions: dfaTransitions,
    accept,
  };

  drawDFA(currentDFA);
}

/***********************
 * DFA → PDA (Proper Stack PDA)
 ***********************/
function convertToPDA() {
  if (!currentDFA) return;

  // Create a new start state for PDA
  const newStartState = "q_start_pda";

  // We assume regex is like a^n b^n ... pattern
  // Stack starts with Z
  const stackStart = "Z";
  const pdaStates = [newStartState, ...currentDFA.states, "q_accept"];
  const pdaTransitions = [];

  // Initialize stack: transition from new start state to original start state
  pdaTransitions.push({
    from: newStartState,
    to: currentDFA.start,
    input: "ε",
    pop: "ε",
    push: stackStart,
  });

  // Push for 'a', pop for 'b'
  currentDFA.transitions.forEach((t) => {
    if (t.symbol === "a") {
      pdaTransitions.push({
        from: t.from,
        to: t.to,
        input: "a",
        pop: "ε",
        push: "A",
      });
    } else if (t.symbol === "b") {
      pdaTransitions.push({
        from: t.from,
        to: t.to,
        input: "b",
        pop: "A",
        push: "ε",
      });
    } else {
      // For other symbols like 'c', require stackStart
      pdaTransitions.push({
        from: t.from,
        to: "q_accept",
        input: t.symbol,
        pop: stackStart,
        push: stackStart,
      });
    }
  });

  currentPDA = {
    states: pdaStates,
    start: newStartState,
    accept: ["q_accept"],
    stackStart,
    transitions: pdaTransitions,
  };

  drawPDA(currentPDA);
}

/***********************
 * DRAW NFA
 ***********************/
function drawNFA(nfa) {
  const elements = [];
  const states = new Set();

  nfa.transitions.forEach((t) => {
    states.add(t.from);
    states.add(t.to);
  });

  states.forEach((s) => {
    let label = s;
    if (s === nfa.start) label = "START\n" + s;
    if (s === nfa.end) label = "ACCEPT\n" + s;

    elements.push({ data: { id: s, label } });
  });

  nfa.transitions.forEach((t) => {
    elements.push({
      data: { source: t.from, target: t.to, label: t.symbol },
    });
  });

  render(elements, nfa.start);
}

/***********************
 * DRAW DFA
 ***********************/
function drawDFA(dfa) {
  const elements = [];

  dfa.states.forEach((s) => {
    let label = s;
    if (s === dfa.start) label = "START\n" + s;
    if (dfa.accept.includes(s)) label = "ACCEPT\n" + s;

    elements.push({ data: { id: s, label } });
  });

  dfa.transitions.forEach((t) => {
    elements.push({
      data: { source: t.from, target: t.to, label: t.symbol },
    });
  });

  render(elements, dfa.start);
}

/***********************
 * DRAW PDA
 ***********************/
function drawPDA(pda) {
  const elements = [];
  const connectedStates = new Set();

  // Collect all states that are connected through transitions
  pda.transitions.forEach((t) => {
    connectedStates.add(t.from);
    connectedStates.add(t.to);
  });

  // Only draw states that are connected (have transitions)
  connectedStates.forEach((s) => {
    let label = s;
    if (s === pda.start) label = "START\n" + s;
    if (pda.accept.includes(s)) label = "ACCEPT\n" + s;

    elements.push({ data: { id: s, label } });
  });

  pda.transitions.forEach((t) => {
    const label = `${t.input}, ${t.pop} → ${t.push}`;
    elements.push({
      data: { source: t.from, target: t.to, label },
    });
  });

  render(elements, pda.start);
}

/***********************
 * CYTOSCAPE RENDER
 ***********************/
function render(elements, root) {
  if (cy) cy.destroy();

  cy = cytoscape({
    container: document.getElementById("cy"),
    elements,
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "14px",
          "font-weight": "bold",
          "font-family": "Arial, sans-serif",
          color: "#c9d1d9",
          "background-color": "#161b22",
          "border-width": 2,
          "border-color": "#58a6ff",
          width: "label",
          height: "label",
          "text-wrap": "wrap",
          "text-max-width": "100px",
          shape: "round-rectangle",
          padding: "10px",
        },
      },
      {
        selector: "edge",
        style: {
          label: "data(label)",
          "font-size": "16px",
          "font-weight": "bold",
          "font-family": "Arial, sans-serif",
          "text-background-color": "#0d1117",
          "text-background-opacity": 0.8,
          "text-background-padding": "3px",
          "text-background-shape": "roundrectangle",
          "text-rotation": "autorotate",
          "text-margin-y": -5,
          color: "#58a6ff",
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "line-color": "#8b949e",
          "target-arrow-color": "#58a6ff",
          width: 2,
        },
      },
    ],
    layout: {
      name: "breadthfirst",
      directed: true,
      roots: [root],
    },
  });
}
