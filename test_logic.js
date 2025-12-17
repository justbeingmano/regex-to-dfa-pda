

let stateCount = 0;
function newState() {
    return `q${stateCount++}`;
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


try {
    const regex = "(ab)*";
    console.log(`Testing Regex: ${regex}`);

    const tokens = tokenize(regex);
    console.log("Tokens:", tokens.join(' '));

    const withConcat = addConcat(tokens);
    console.log("With Concat:", withConcat.join(' '));

    const postfix = toPostfix(withConcat);
    console.log("Postfix:", postfix.join(' '));

    const nfa = postfixToNFA(postfix);
    console.log("NFA Generated!");
    console.log("Start State:", nfa.start);
    console.log("End State:", nfa.end);
    console.log("Transition Count:", nfa.transitions.length);

    console.log("SUCCESS: Logic is valid.");
} catch (e) {
    console.error("FAILURE: Runtime error encountered.");
    console.error(e);
}
