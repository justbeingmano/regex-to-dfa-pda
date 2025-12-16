/***********************
 * STEP 1: Tokenizer
 ***********************/
function tokenize(regex) {
  const tokens = [];
  for (let i = 0; i < regex.length; i++) {
    const c = regex[i];
    if (c !== " ") tokens.push(c);
  }
  return tokens;
}

/*******************************
 * STEP 2: Add Concatenation '.'
 *******************************/
function addConcat(tokens) {
  const result = [];
  const isSymbol = c => /[a-z]/.test(c) || c === ")" || c === "*";

  for (let i = 0; i < tokens.length; i++) {
    result.push(tokens[i]);

    if (
      i < tokens.length - 1 &&
      isSymbol(tokens[i]) &&
      (/[a-z(]/.test(tokens[i + 1]))
    ) {
      result.push(".");
    }
  }
  return result;
}

/********************************
 * STEP 3: Infix → Postfix
 ********************************/
function toPostfix(tokens) {
  const prec = { "|": 1, ".": 2, "*": 3 };
  const output = [];
  const stack = [];

  for (const t of tokens) {
    if (/[a-z]/.test(t)) {
      output.push(t);
    } else if (t === "(") {
      stack.push(t);
    } else if (t === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") {
        output.push(stack.pop());
      }
      stack.pop();
    } else {
      while (
        stack.length &&
        prec[stack[stack.length - 1]] >= prec[t]
      ) {
        output.push(stack.pop());
      }
      stack.push(t);
    }
  }
  while (stack.length) output.push(stack.pop());
  return output;
}

/***********************
 * TEST BUTTON
 ***********************/
function convert() {
  const regex = document.getElementById("regexInput").value;

  const tokens = tokenize(regex);
  const withConcat = addConcat(tokens);
  const postfix = toPostfix(withConcat);

  console.log("Tokens:", tokens);
  console.log("With concat:", withConcat);
  console.log("Postfix:", postfix);
}
function convert() {
  const regex = document.getElementById("regexInput").value;

  const tokens = tokenize(regex);
  const withConcat = addConcat(tokens);
  const postfix = toPostfix(withConcat);

  drawSteps(tokens, withConcat, postfix);
}
function drawSteps(tokens, withConcat, postfix) {
  const elements = [];
  let y = 0;

  function addRow(arr, title) {
    elements.push({
      data: { id: title, label: title },
      position: { x: -100, y }
    });

    for (let i = 0; i < arr.length; i++) {
      elements.push({
        data: { id: title + "_" + i, label: arr[i] },
        position: { x: i * 70, y }
      });
    }
    y += 100;
  }

  addRow(tokens, "Tokens");
  addRow(withConcat, "Concat");
  addRow(postfix, "Postfix");

  cytoscape({
    container: document.getElementById("cy"),
    elements,
    style: [
      {
        selector: "node[label]",
        style: {
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "border-width": 2,
          "background-color": "#fff"
        }
      }
    ],
    layout: { name: "preset" }
  });
}
