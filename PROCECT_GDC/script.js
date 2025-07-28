// DOM elements
const btnContainer = document.getElementById('btnContainer');
const out = document.getElementById('output');
const hist = document.getElementById('history');
const themeToggle = document.getElementById('themeToggle');
const modeButtons = document.querySelectorAll('.mode-tabs button');
const businessHistoryEl = document.getElementById('businessHistory');
const historyList = document.getElementById('historyList');
const customerInput = document.getElementById('customerName');
const angleModeSel = document.getElementById('angleMode');
const downloadCSVBtn = document.getElementById('downloadCSV');

let mode = 'general', expr = '';
let config = { angles: 'rad' };
let businessHistory = JSON.parse(localStorage.getItem('businessCalcHistory') || '[]');

// Initialize angle (rad/deg) support
(function initAngleSupport() {
  const trig = ['sin','cos','tan','asin','acos','atan'];
  trig.forEach(name => {
    const fn = math[name];
    math.import({
      [name]: math.typed(name, {
        number: x => {
          let val = (['sin','cos','tan'].includes(name))
            ? (config.angles === 'deg' ? x / 180 * Math.PI : x)
            : x;
          let res = fn(val);
          return (['asin','acos','atan'].includes(name) && config.angles === 'deg')
            ? res * 180 / Math.PI
            : res;
        },
        'Array | Matrix': x => math.map(x, v => math[name](v))
      })
    }, { override: true });
  });
})();

angleModeSel.addEventListener('change', () => {
  config.angles = angleModeSel.value;
});

// Button layouts
const layouts = {
  general:     ['AC','←','%','7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'],
  scientific:  ['AC','←','(',')','sin','cos','tan','/','7','8','9','*','4','5','6','-','1','2','3','+','0','.','=','x^y','√','π','%'],
  business:    ['AC','←','History','%','√','Tax','7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+']
};

function loadButtons() {
  btnContainer.innerHTML = '';
  layouts[mode].forEach(lbl => {
    const b = document.createElement('button');
    b.textContent = lbl;
    if (/[\+\-\*\/=√%\^×]/.test(lbl) || ['←','AC','sin','cos','tan','π','x^y','Tax','History'].includes(lbl))
      b.classList.add('operator');
    if (lbl === '=') b.classList.add('equals');
    if (lbl === '0') b.classList.add('zero');
    b.addEventListener('click', () => clickBtn(lbl));
    btnContainer.appendChild(b);
  });
  businessHistoryEl.style.display = mode === 'business' ? 'block' : 'none';
  angleModeSel.style.display = mode === 'scientific' ? 'inline-block' : 'none';
}

function clickBtn(v) {
  if (mode === 'business' && v === 'History') return renderBusinessHistory();
  switch (v) {
    case 'AC': expr = ''; hist.textContent = ''; update(); break;
    case '←': expr = expr.slice(0, -1); update(); break;
    case '%':
      expr = expr.replace(
        /([0-9.]+)\s*([+\-*/])\s*([0-9.]+)$/,
        (m, base, op, pct) => `${base}${op}(${base}*${pct}/100)`
      );
      update(); break;
    case '=':
      calculate();
      if (mode === 'business') handleBusinessEntry(expr, out.textContent);
      break;
    case 'x^y': expr += '^'; update(); break;
    case 'π': expr += 'pi'; update(); break;
    case '√': expr += 'sqrt('; update(); break;
    case 'sin': case 'cos': case 'tan': expr += v + '('; update(); break;
    case 'Tax': expr += '*1.18'; update(); break;
    default: expr += v; update();
  }
}

function update() {
  out.textContent = expr || '0';
}

function calculate() {
  try {
    let result = math.evaluate(expr);
    if (Math.abs(result) < Number.EPSILON) result = 0;
    hist.textContent = expr + ' =';
    expr = result.toString();
    update();
  } catch {
    out.textContent = 'Error'; expr = '';
  }
}

// Manage business history entry + CSV-ready
function handleBusinessEntry(exprStr, res) {
  const name = customerInput.value.trim();
  businessHistory.push({ expr: exprStr, res, customer: name });
  if (businessHistory.length > 20) businessHistory.shift();
  localStorage.setItem('businessCalcHistory', JSON.stringify(businessHistory));
  renderBusinessHistory();
  customerInput.focus();
  customerInput.select();
  customerInput.classList.add('highlight');
  setTimeout(() => customerInput.classList.remove('highlight'), 800);
}

function renderBusinessHistory() {
  historyList.innerHTML = '';
  businessHistory.slice().reverse().forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.customer ? item.customer + ': ' : ''}${item.expr} = ${item.res}`;
    li.onclick = () => { expr = item.res; update(); };
    historyList.appendChild(li);
  });
}

function clearBusinessHistory() {
  businessHistory = [];
  localStorage.removeItem('businessCalcHistory');
  renderBusinessHistory();
}

modeButtons.forEach(b => {
  b.addEventListener('click', () => {
    modeButtons.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    mode = b.dataset.mode;
    expr = ''; hist.textContent = ''; update();
    loadButtons();
  });
});

themeToggle.addEventListener('change', () => {
  document.documentElement.setAttribute(
    'data-theme', themeToggle.checked ? 'dark' : 'light'
  );
});

document.addEventListener('keydown', ev => {
  const k = ev.key;
  if (/^[0-9.]$/.test(k)) clickBtn(k);
  else if (['+','-','*','/','^','%','(',')'].includes(k)) clickBtn(k);
  else if (k === 's') clickBtn('sin');
  else if (k === 'c') clickBtn('cos');
  else if (k === 't') clickBtn('tan');
  else if (k === 'Enter') { ev.preventDefault(); clickBtn('='); }
  else if (k === 'Backspace') clickBtn('←');
  else if (k === 'Escape') clickBtn('AC');
});

// CSV download implementation
downloadCSVBtn.addEventListener('click', () => {
  const data = businessHistory.map(item => [item.customer, item.expr, item.res]);
  data.unshift(['Customer', 'Expression', 'Result']);
  const csvContent = data.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calculator_business_history.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Ensure customer name field remains editable
customerInput.disabled = false;
customerInput.readOnly = false;

// Initial setup
loadButtons();
update();
renderBusinessHistory();
