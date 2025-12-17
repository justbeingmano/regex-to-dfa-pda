
let stateCount = 0;


function newState() {
  return `q${stateCount++}`;
}


function convert() {
  stateCount = 0;

  const regex = document.getElementById("regexInput").value;

  const tokens = tokenize(regex);
  const withConcat = addConcat(tokens);
  const postfix = toPostfix(withConcat);
  const nfa = postfixToNFA(postfix);

  drawNFA(nfa);
}


function tokenize(regex) {
  return regex.split("");
}


function addConcat(tokens) {
  const result = [];
  const symbols = /[a-z0-9]/;

  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    const next = tokens[i + 1];
    result.push(curr);

    if (
      next &&
      (symbols.test(curr) || curr === ')' || curr === '*') &&
      (symbols.test(next) || next === '(')
    ) {
      result.push('.');
    }
  }
  return result;
}


function toPostfix(tokens) {
  const output = [];
  const stack = [];
  const prec = { '|': 1, '.': 2, '*': 3 };

  tokens.forEach(token => {
    if (/[a-z0-9]/.test(token)) {
      output.push(token);
    } else if (token === '(') {
      stack.push(token);
    } else if (token === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') {
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


function postfixToNFA(postfix) {
  const stack = [];

  postfix.forEach(token => {
    if (/[a-z0-9]/.test(token)) {
      const start = newState();
      const end = newState();
      stack.push({ start, end, transitions: [{ from: start, to: end, symbol: token }] });
    }

    else if (token === '.') {
      const b = stack.pop();
      const a = stack.pop();
      a.transitions.push({ from: a.end, to: b.start, symbol: 'ε' });
      stack.push({ start: a.start, end: b.end, transitions: [...a.transitions, ...b.transitions] });
    }

    else if (token === '|') {
      const b = stack.pop();
      const a = stack.pop();
      const start = newState();
      const end = newState();
      const transitions = [
        { from: start, to: a.start, symbol: 'ε' },
        { from: start, to: b.start, symbol: 'ε' },
        { from: a.end, to: end, symbol: 'ε' },
        { from: b.end, to: end, symbol: 'ε' },
        ...a.transitions,
        ...b.transitions
      ];
      stack.push({ start, end, transitions });
    }

    else if (token === '*') {
      const a = stack.pop();
      const start = newState();
      const end = newState();
      const transitions = [
        { from: start, to: a.start, symbol: 'ε' },
        { from: start, to: end, symbol: 'ε' },
        { from: a.end, to: a.start, symbol: 'ε' },
        { from: a.end, to: end, symbol: 'ε' },
        ...a.transitions
      ];
      stack.push({ start, end, transitions });
    }
  });

  return stack.pop();
}







function drawNFA(nfa) {
  const elements = [];

  const states = new Set();
  nfa.transitions.forEach(t => {
    states.add(t.from);
    states.add(t.to);
  });

  states.forEach(s => {
    let label = s;
    if (s === nfa.start) label = 'START\\n' + s;
    if (s === nfa.end) label = 'ACCEPT\\n' + s;

    elements.push({
      data: { id: s, label }
    });
  });

  nfa.transitions.forEach(t => {
    elements.push({ data: { source: t.from, target: t.to, label: t.symbol } });
  });

  cytoscape({
    container: document.getElementById('cy'),
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'color': '#c9d1d9',
          'text-valign': 'center',
          'text-halign': 'center',
          'background-color': '#161b22',
          'border-width': 2,
          'border-color': '#c9d1d9'
        }
      },
      {
        selector: `node[id = "${nfa.end}"]`,
        style: {
          'border-width': 4,
          'border-style': 'double'
        }
      },
      {
        selector: 'edge',
        style: {
          'label': 'data(label)',
          'width': 3,
          'color': '#58a6ff',
          'line-color': '#8b949e',
          'target-arrow-color': '#58a6ff',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.5,
          'curve-style': 'bezier',
          'text-background-color': '#0d1117',
          'text-background-opacity': 1,
          'font-weight': 'bold',
          'font-size': '20px'
        }
      }
    ],
    layout: {
      name: 'breadthfirst',
      directed: true,
      orientation: 'vertical',
      roots: [nfa.start]
    }
  });
}
