/**
 * ScriptBuilder — Drag-and-drop code block builder for ItsAstralMC scripts.
 * Designed to help authors create JS-based Script API code visually.
 */

import { el, clearElement, showToast, showModal, closeModal } from '../shared/DomUtils';
import {
  type ScriptBlock,
  type ScriptBlockType,
  type ScriptMode,
  createScriptBlock,
  generateScript,
} from './ScriptBuilderCodeGen';

interface AIProviderConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  type: 'openai' | 'generic';
  model?: string;
  requestTemplate?: string;
  responsePath?: string;
}

interface PaletteItem {
  type: ScriptBlockType;
  label: string;
  icon: string;
  color: string;
  description: string;
  expressionTemplate?: string;
}

const AI_PROVIDERS_STORAGE_KEY = 'itsastralmc-ai-providers';
const DEFAULT_AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'openai-default',
    name: 'OpenAI / Gemini-style',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    type: 'openai',
    model: 'gpt-4o-mini',
    requestTemplate: undefined,
    responsePath: undefined,
  },
];

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'import',      label: 'Import',              icon: '📦', color: '#89b4fa', description: 'Import a module or package' },
  { type: 'variable',    label: 'Variable',            icon: '🔧', color: '#a6e3a1', description: 'Declare a constant or variable' },
  { type: 'function',    label: 'Function',            icon: 'ƒ', color: '#cba6f7', description: 'Define a reusable function' },
  { type: 'if',          label: 'If',                  icon: '❓', color: '#fab387', description: 'Conditional execution block' },
  { type: 'console_log', label: 'Console Log',         icon: '🖨️', color: '#94e2d5', description: 'Print a message to the console' },
  { type: 'return',      label: 'Return',              icon: '⏎', color: '#f9e2af', description: 'Return a value from a function' },
  { type: 'expression',  label: 'Expression',          icon: '✱', color: '#f5c2e7', description: 'Write a custom JS expression' },
  { type: 'expression',  label: 'Let variable',        icon: '🔐', color: '#b4befe', description: 'Create a let variable', expressionTemplate: 'let value = 0;' },
  { type: 'expression',  label: 'Const variable',      icon: '📌', color: '#cdd6f4', description: 'Create a constant variable', expressionTemplate: 'const value = 42;' },
  { type: 'expression',  label: 'Arrow function',       icon: '➡️', color: '#f5e0dc', description: 'Arrow function shorthand', expressionTemplate: 'const myFunction = (args) => {
  return args;
};' },
  { type: 'expression',  label: 'Async function',       icon: '⚡', color: '#f2cdcd', description: 'Create an async function', expressionTemplate: 'async function fetchData() {
  const response = await fetch(url);
  return response.json();
}' },
  { type: 'expression',  label: 'Class',                icon: '🏛️', color: '#f8bd96', description: 'Declare a class', expressionTemplate: 'class MyClass {
  constructor() {
    this.value = 0;
  }
}' },
  { type: 'expression',  label: 'Object literal',       icon: '🧱', color: '#a6e3a1', description: 'Create an object', expressionTemplate: 'const settings = {
  mode: 'auto',
  enabled: true,
};' },
  { type: 'expression',  label: 'Array literal',        icon: '🧮', color: '#f9e2af', description: 'Create an array', expressionTemplate: 'const items = [1, 2, 3];' },
  { type: 'expression',  label: 'Template literal',     icon: '🧵', color: '#94e2d5', description: 'Build a template string', expressionTemplate: 'const message = `Hello ${name}, today is ${new Date().toDateString()}`;' },
  { type: 'expression',  label: 'Ternary expression',   icon: '❓', color: '#fab387', description: 'Use a ternary operator', expressionTemplate: 'const status = isActive ? 'online' : 'offline';' },
  { type: 'expression',  label: 'Switch statement',     icon: '🔀', color: '#89b4fa', description: 'Create a switch branch', expressionTemplate: 'switch (value) {
  case 1:
    break;
  default:
    break;
}' },
  { type: 'expression',  label: 'Try / Catch',          icon: '🛡️', color: '#cba6f7', description: 'Add error handling', expressionTemplate: 'try {
  // code
} catch (error) {
  console.error(error);
}' },
  { type: 'expression',  label: 'Fetch request',        icon: '🌐', color: '#94e2d5', description: 'Send an HTTP request', expressionTemplate: 'const response = await fetch(url);
const data = await response.json();' },
  { type: 'expression',  label: 'JSON parse',           icon: '🧠', color: '#a6e3a1', description: 'Parse JSON data', expressionTemplate: 'const data = JSON.parse(jsonString);' },
  { type: 'expression',  label: 'JSON stringify',       icon: '🧾', color: '#f5c2e7', description: 'Serialize JSON', expressionTemplate: 'const jsonString = JSON.stringify(data, null, 2);' },
  { type: 'expression',  label: 'Array map',            icon: '🗺️', color: '#b4befe', description: 'Transform array items', expressionTemplate: 'const mapped = items.map(item => item * 2);' },
  { type: 'expression',  label: 'Array filter',         icon: '🔎', color: '#f2cdcd', description: 'Filter array values', expressionTemplate: 'const filtered = items.filter(item => item > 10);' },
  { type: 'expression',  label: 'Array reduce',         icon: '➗', color: '#f9e2af', description: 'Reduce an array', expressionTemplate: 'const total = items.reduce((sum, item) => sum + item, 0);' },
  { type: 'expression',  label: 'Promise then',         icon: '🔗', color: '#f8bd96', description: 'Chain a promise', expressionTemplate: 'fetch(url).then(response => response.json()).then(data => {
  console.log(data);
});' },
  { type: 'expression',  label: 'Await / Async',        icon: '⏳', color: '#94e2d5', description: 'Await an async call', expressionTemplate: 'const result = await doSomethingAsync();' },
  { type: 'expression',  label: 'Set timeout',          icon: '⏰', color: '#fab387', description: 'Delay execution', expressionTemplate: 'setTimeout(() => {
  console.log('timeout');
}, 1000);' },
  { type: 'expression',  label: 'Set interval',         icon: '🔁', color: '#89b4fa', description: 'Repeat code periodically', expressionTemplate: 'setInterval(() => {
  console.log('tick');
}, 1000);' },
  { type: 'expression',  label: 'Event listener',       icon: '🖱️', color: '#a6e3a1', description: 'Listen for DOM events', expressionTemplate: 'document.addEventListener('click', () => {
  console.log('clicked');
});' },
  { type: 'expression',  label: 'DOM query',           icon: '🧩', color: '#f5e0dc', description: 'Select a DOM element', expressionTemplate: 'const element = document.querySelector('.my-class');' },
  { type: 'expression',  label: 'DOM update',          icon: '✏️', color: '#b4befe', description: 'Change DOM content', expressionTemplate: 'if (element) element.textContent = 'Updated';' },
  { type: 'expression',  label: 'Math operation',       icon: '➕', color: '#f2cdcd', description: 'Perform arithmetic', expressionTemplate: 'const sum = a + b * c;' },
  { type: 'expression',  label: 'Random number',        icon: '🎲', color: '#f9e2af', description: 'Generate a random value', expressionTemplate: 'const random = Math.random();' },
  { type: 'expression',  label: 'Date now',             icon: '📅', color: '#a6e3a1', description: 'Read the current date/time', expressionTemplate: 'const now = new Date();' },
  { type: 'expression',  label: 'Regex test',           icon: '🔍', color: '#94e2d5', description: 'Test text with regex', expressionTemplate: 'const matches = /test/i.test(text);' },
  { type: 'expression',  label: 'Template cast',        icon: '🧵', color: '#cba6f7', description: 'Create a template string', expressionTemplate: 'const title = `Hello ${name}`;' },
  { type: 'expression',  label: 'Destructure',          icon: '🧬', color: '#89b4fa', description: 'Destructure object or array', expressionTemplate: 'const { a, b } = config;
const [first, second] = items;' },
  { type: 'expression',  label: 'Spread operator',      icon: '🌬️', color: '#f5c2e7', description: 'Use spread syntax', expressionTemplate: 'const copy = { ...settings, active: true };' },
  { type: 'expression',  label: 'Object assign',        icon: '🧩', color: '#f8bd96', description: 'Merge objects', expressionTemplate: 'const merged = Object.assign({}, defaults, options);' },
  { type: 'expression',  label: 'Class method',         icon: '🧠', color: '#a6e3a1', description: 'Define a class method', expressionTemplate: 'class User {
  greet() {
    return 'Hello';
  }
}' },
  { type: 'expression',  label: 'Dynamic import',       icon: '⚙️', color: '#94e2d5', description: 'Load a module dynamically', expressionTemplate: 'const module = await import('./module.js');' },
  { type: 'expression',  label: 'Default export',       icon: '📤', color: '#fab387', description: 'Export a default value', expressionTemplate: 'export default function main() {
  return true;
};' },
  { type: 'expression',  label: 'Named export',         icon: '📦', color: '#cba6f7', description: 'Export named symbols', expressionTemplate: 'export const helper = () => {
  return true;
};' },
  { type: 'expression',  label: 'Debugger statement',   icon: '🐞', color: '#f2cdcd', description: 'Insert a debugger breakpoint', expressionTemplate: 'debugger;' },
  { type: 'expression',  label: 'Throw error',          icon: '⚠️', color: '#f9e2af', description: 'Throw an exception', expressionTemplate: 'throw new Error('Unexpected state');' },
  { type: 'expression',  label: 'Window alert',         icon: '🔔', color: '#89b4fa', description: 'Show a browser alert', expressionTemplate: 'alert('Hello world');' },
  { type: 'expression',  label: 'Prompt input',         icon: '💬', color: '#a6e3a1', description: 'Ask the user for input', expressionTemplate: 'const response = prompt('Enter value:');' },
  { type: 'expression',  label: 'Confirm dialog',       icon: '✅', color: '#94e2d5', description: 'Ask the user to confirm', expressionTemplate: 'const confirmed = confirm('Continue?');' },
  { type: 'expression',  label: 'Callback function',    icon: '🔁', color: '#b4befe', description: 'Pass a callback', expressionTemplate: 'function withCallback(callback) {
  callback();
}' },
  { type: 'expression',  label: 'For loop',            icon: '🔁', color: '#f8bd96', description: 'Create a standard for loop', expressionTemplate: 'for (let i = 0; i < 10; i++) {
  console.log(i);
}' },
  { type: 'expression',  label: 'For...of loop',       icon: '📜', color: '#f5e0dc', description: 'Iterate over values', expressionTemplate: 'for (const item of items) {
  console.log(item);
}' },
  { type: 'expression',  label: 'For...in loop',       icon: '🔁', color: '#a6e3a1', description: 'Iterate over object keys', expressionTemplate: 'for (const key in data) {
  console.log(key);
}' },
  { type: 'expression',  label: 'While loop',          icon: '⏳', color: '#94e2d5', description: 'Use a while loop', expressionTemplate: 'while (count < 10) {
  count++;
}' },
  { type: 'expression',  label: 'Do...while loop',     icon: '🔂', color: '#fab387', description: 'Use a do/while loop', expressionTemplate: 'do {
  count++;
} while (count < 10);' },
  { type: 'expression',  label: 'Promise all',         icon: '📦', color: '#cba6f7', description: 'Wait for many promises', expressionTemplate: 'const results = await Promise.all([promise1, promise2]);' },
  { type: 'expression',  label: 'Promise race',        icon: '🏁', color: '#f2cdcd', description: 'Use Promise.race', expressionTemplate: 'const winner = await Promise.race([promise1, promise2]);' },
  { type: 'expression',  label: 'Generator function',   icon: '🧵', color: '#f9e2af', description: 'Declare a generator', expressionTemplate: 'function* generator() {
  yield 1;
  yield 2;
}' },
  { type: 'expression',  label: 'Custom snippet',       icon: '🛠️', color: '#89b4fa', description: 'Create your own code snippet', expressionTemplate: '/* custom JS code */' },
  { type: 'expression',  label: 'Deep clone',           icon: '🪞', color: '#94e2d5', description: 'Deep clone an object', expressionTemplate: 'const clone = JSON.parse(JSON.stringify(obj));' },
  { type: 'expression',  label: 'Array find',           icon: '🔎', color: '#a6e3a1', description: 'Find an item in an array', expressionTemplate: 'const match = items.find(item => item.id === id);' },
  { type: 'expression',  label: 'Array some',           icon: '✔️', color: '#f5c2e7', description: 'Check if some items match', expressionTemplate: 'const hasMatch = items.some(item => item.active);' },
  { type: 'expression',  label: 'Array every',          icon: '✅', color: '#fab387', description: 'Check whether every item matches', expressionTemplate: 'const allActive = items.every(item => item.active);' },
  { type: 'expression',  label: 'Object keys',          icon: '🗝️', color: '#89b4fa', description: 'Get object keys', expressionTemplate: 'const keys = Object.keys(data);' },
  { type: 'expression',  label: 'Object values',        icon: '📥', color: '#cba6f7', description: 'Get object values', expressionTemplate: 'const values = Object.values(data);' },
  { type: 'expression',  label: 'Fetch JSON helper',    icon: '📡', color: '#94e2d5', description: 'Helper for fetching JSON', expressionTemplate: 'async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}' },
  { type: 'expression',  label: 'Sleep utility',        icon: '😴', color: '#a6e3a1', description: 'Pause execution', expressionTemplate: 'const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));' },
  { type: 'expression',  label: 'Recursive function',   icon: '🌀', color: '#f5e0dc', description: 'Define a recursive function', expressionTemplate: 'function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}' },
  { type: 'expression',  label: 'Set union',            icon: '🔗', color: '#f8bd96', description: 'Union two sets', expressionTemplate: 'const union = new Set([...setA, ...setB]);' },
  { type: 'expression',  label: 'Set intersection',      icon: '🔗', color: '#b4befe', description: 'Intersect two sets', expressionTemplate: 'const intersection = new Set([...setA].filter(x => setB.has(x)));' },
  { type: 'expression',  label: 'Map helper',           icon: '🗺️', color: '#94e2d5', description: 'Use a Map object', expressionTemplate: 'const map = new Map();
map.set('key', value);' },
  { type: 'expression',  label: 'URL Search Params',    icon: '🔍', color: '#89b4fa', description: 'Parse URL query params', expressionTemplate: 'const params = new URLSearchParams(window.location.search);' },
  { type: 'expression',  label: 'LocalStorage save',     icon: '💾', color: '#a6e3a1', description: 'Save data to localStorage', expressionTemplate: 'localStorage.setItem('app.data', JSON.stringify(data));' },
  { type: 'expression',  label: 'LocalStorage load',     icon: '📥', color: '#f5c2e7', description: 'Load data from localStorage', expressionTemplate: 'const saved = JSON.parse(localStorage.getItem('app.data') || 'null');' },
  { type: 'expression',  label: 'Debounce helper',       icon: '⌛', color: '#fab387', description: 'Create a debounce function', expressionTemplate: 'function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}' },
  { type: 'expression',  label: 'Throttle helper',       icon: '🏎️', color: '#f2cdcd', description: 'Create a throttle function', expressionTemplate: 'function throttle(fn, delay) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last > delay) {
      last = now;
      fn(...args);
    }
  };
}' },
  { type: 'expression',  label: 'Error logger',          icon: '🧯', color: '#89b4fa', description: 'Log errors with details', expressionTemplate: 'function logError(err) {
  console.error('Error:', err);
}' },
  { type: 'expression',  label: 'Array flat',           icon: '🧩', color: '#cba6f7', description: 'Flatten an array', expressionTemplate: 'const flat = nested.flat();' },
  { type: 'expression',  label: 'Async iterator',        icon: '🔁', color: '#94e2d5', description: 'Use an async iterator', expressionTemplate: 'for await (const item of asyncIterable) {
  console.log(item);
}' },
  { type: 'expression',  label: 'Path join',            icon: '🛣️', color: '#a6e3a1', description: 'Join path segments', expressionTemplate: 'const path = [dir, file].join('/');' },
  { type: 'expression',  label: 'Base64 encode',        icon: '🔐', color: '#f5e0dc', description: 'Encode a string in base64', expressionTemplate: 'const encoded = btoa('text');' },
  { type: 'expression',  label: 'Base64 decode',        icon: '🔓', color: '#b4befe', description: 'Decode base64 text', expressionTemplate: 'const decoded = atob(encoded);' },
  { type: 'expression',  label: 'Number parse',         icon: '🔢', color: '#f8bd96', description: 'Parse a number from text', expressionTemplate: 'const num = parseFloat(str);' },
  { type: 'expression',  label: 'String trim',          icon: '✂️', color: '#f2cdcd', description: 'Trim whitespace from a string', expressionTemplate: 'const trimmed = text.trim();' },
  { type: 'expression',  label: 'String replace',       icon: '🔁', color: '#fab387', description: 'Replace text with a regex', expressionTemplate: 'const updated = text.replace(/foo/g, 'bar');' },
  { type: 'expression',  label: 'New Date',             icon: '📆', color: '#89b4fa', description: 'Create a new Date object', expressionTemplate: 'const now = new Date();' },
  { type: 'expression',  label: 'Math random',          icon: '🎯', color: '#a6e3a1', description: 'Generate a random number', expressionTemplate: 'const value = Math.random();' },
  { type: 'expression',  label: 'Print line',           icon: '📝', color: '#94e2d5', description: 'Print text to console', expressionTemplate: 'console.log('Hello world');' },
  { type: 'expression',  label: 'Custom snippet',       icon: '🛠️', color: '#89b4fa', description: 'Create your own code snippet', expressionTemplate: '/* custom JS code */' },
];' },
  { type: 'expression',  label: 'Template literal',     icon: '🧵', color: '#94e2d5', description: 'Build a template string', expressionTemplate: 'const message = `Hello ${name}, today is ${new Date().toDateString()}`;' },
  { type: 'expression',  label: 'Ternary expression',   icon: '❓', color: '#fab387', description: 'Use a ternary operator', expressionTemplate: 'const status = isActive ? \'online\' : \'offline\';' },
  { type: 'expression',  label: 'Switch statement',     icon: '🔀', color: '#89b4fa', description: 'Create a switch branch', expressionTemplate: 'switch (value) {\n  case 1:\n    break;\n  default:\n    break;\n}' },
  { type: 'expression',  label: 'Try / Catch',          icon: '🛡️', color: '#cba6f7', description: 'Add error handling', expressionTemplate: 'try {\n  // code\n} catch (error) {\n  console.error(error);\n}' },
  { type: 'expression',  label: 'Fetch request',        icon: '🌐', color: '#94e2d5', description: 'Send an HTTP request', expressionTemplate: 'const response = await fetch(url);\nconst data = await response.json();' },
  { type: 'expression',  label: 'JSON parse',           icon: '🧠', color: '#a6e3a1', description: 'Parse JSON data', expressionTemplate: 'const data = JSON.parse(jsonString);' },
  { type: 'expression',  label: 'JSON stringify',       icon: '🧾', color: '#f5c2e7', description: 'Serialize JSON', expressionTemplate: 'const jsonString = JSON.stringify(data, null, 2);' },
  { type: 'expression',  label: 'Array map',            icon: '🗺️', color: '#b4befe', description: 'Transform array items', expressionTemplate: 'const mapped = items.map(item => item * 2);' },
  { type: 'expression',  label: 'Array filter',         icon: '🔎', color: '#f2cdcd', description: 'Filter array values', expressionTemplate: 'const filtered = items.filter(item => item > 10);' },
  { type: 'expression',  label: 'Array reduce',         icon: '➗', color: '#f9e2af', description: 'Reduce an array', expressionTemplate: 'const total = items.reduce((sum, item) => sum + item, 0);' },
  { type: 'expression',  label: 'Promise then',         icon: '🔗', color: '#f8bd96', description: 'Chain a promise', expressionTemplate: 'fetch(url).then(response => response.json()).then(data => {\n  console.log(data);\n});' },
  { type: 'expression',  label: 'Await / Async',        icon: '⏳', color: '#94e2d5', description: 'Await an async call', expressionTemplate: 'const result = await doSomethingAsync();' },
  { type: 'expression',  label: 'Set timeout',          icon: '⏰', color: '#fab387', description: 'Delay execution', expressionTemplate: 'setTimeout(() => {\n  console.log(\'timeout\');\n}, 1000);' },
  { type: 'expression',  label: 'Set interval',         icon: '🔁', color: '#89b4fa', description: 'Repeat code periodically', expressionTemplate: 'setInterval(() => {\n  console.log(\'tick\');\n}, 1000);' },
  { type: 'expression',  label: 'Event listener',       icon: '🖱️', color: '#a6e3a1', description: 'Listen for DOM events', expressionTemplate: 'document.addEventListener(\'click\', () => {\n  console.log(\'clicked\');\n});' },
  { type: 'expression',  label: 'DOM query',           icon: '🧩', color: '#f5e0dc', description: 'Select a DOM element', expressionTemplate: 'const element = document.querySelector(\'.my-class\');' },
  { type: 'expression',  label: 'DOM update',          icon: '✏️', color: '#b4befe', description: 'Change DOM content', expressionTemplate: 'if (element) element.textContent = \'Updated\';' },
  { type: 'expression',  label: 'Math operation',       icon: '➕', color: '#f2cdcd', description: 'Perform arithmetic', expressionTemplate: 'const sum = a + b * c;' },
  { type: 'expression',  label: 'Random number',        icon: '🎲', color: '#f9e2af', description: 'Generate a random value', expressionTemplate: 'const random = Math.random();' },
  { type: 'expression',  label: 'Date now',             icon: '📅', color: '#a6e3a1', description: 'Read the current date/time', expressionTemplate: 'const now = new Date();' },
  { type: 'expression',  label: 'Regex test',           icon: '🔍', color: '#94e2d5', description: 'Test text with regex', expressionTemplate: 'const matches = /test/i.test(text);' },
  { type: 'expression',  label: 'Template cast',        icon: '🧵', color: '#cba6f7', description: 'Create a template string', expressionTemplate: 'const title = `Hello ${name}`;' },
  { type: 'expression',  label: 'Destructure',          icon: '🧬', color: '#89b4fa', description: 'Destructure object or array', expressionTemplate: 'const { a, b } = config;\nconst [first, second] = items;' },
  { type: 'expression',  label: 'Spread operator',      icon: '🌬️', color: '#f5c2e7', description: 'Use spread syntax', expressionTemplate: 'const copy = { ...settings, active: true };' },
  { type: 'expression',  label: 'Object assign',        icon: '🧩', color: '#f8bd96', description: 'Merge objects', expressionTemplate: 'const merged = Object.assign({}, defaults, options);' },
  { type: 'expression',  label: 'Class method',         icon: '🧠', color: '#a6e3a1', description: 'Define a class method', expressionTemplate: 'class User {\n  greet() {\n    return \'Hello\';\n  }\n}' },
  { type: 'expression',  label: 'Dynamic import',       icon: '⚙️', color: '#94e2d5', description: 'Load a module dynamically', expressionTemplate: 'const module = await import(\'./module.js\');' },
  { type: 'expression',  label: 'Default export',       icon: '📤', color: '#fab387', description: 'Export a default value', expressionTemplate: 'export default function main() {\n  return true;\n};' },
  { type: 'expression',  label: 'Named export',         icon: '📦', color: '#cba6f7', description: 'Export named symbols', expressionTemplate: 'export const helper = () => {\n  return true;\n};' },
  { type: 'expression',  label: 'Debugger statement',   icon: '🐞', color: '#f2cdcd', description: 'Insert a debugger breakpoint', expressionTemplate: 'debugger;' },
  { type: 'expression',  label: 'Throw error',          icon: '⚠️', color: '#f9e2af', description: 'Throw an exception', expressionTemplate: 'throw new Error(\'Unexpected state\');' },
  { type: 'expression',  label: 'Window alert',         icon: '🔔', color: '#89b4fa', description: 'Show a browser alert', expressionTemplate: 'alert(\'Hello world\');' },
  { type: 'expression',  label: 'Prompt input',         icon: '💬', color: '#a6e3a1', description: 'Ask the user for input', expressionTemplate: 'const response = prompt(\'Enter value:\');' },
  { type: 'expression',  label: 'Confirm dialog',       icon: '✅', color: '#94e2d5', description: 'Ask the user to confirm', expressionTemplate: 'const confirmed = confirm(\'Continue?\');' },
  { type: 'expression',  label: 'Callback function',    icon: '🔁', color: '#b4befe', description: 'Pass a callback', expressionTemplate: 'function withCallback(callback) {\n  callback();\n}' },
  { type: 'expression',  label: 'For loop',            icon: '🔁', color: '#f8bd96', description: 'Create a standard for loop', expressionTemplate: 'for (let i = 0; i < 10; i++) {\n  console.log(i);\n}' },
  { type: 'expression',  label: 'For...of loop',       icon: '📜', color: '#f5e0dc', description: 'Iterate over values', expressionTemplate: 'for (const item of items) {\n  console.log(item);\n}' },
  { type: 'expression',  label: 'For...in loop',       icon: '🔁', color: '#a6e3a1', description: 'Iterate over object keys', expressionTemplate: 'for (const key in data) {\n  console.log(key);\n}' },
  { type: 'expression',  label: 'While loop',          icon: '⏳', color: '#94e2d5', description: 'Use a while loop', expressionTemplate: 'while (count < 10) {\n  count++;\n}' },
  { type: 'expression',  label: 'Do...while loop',     icon: '🔂', color: '#fab387', description: 'Use a do/while loop', expressionTemplate: 'do {\n  count++;\n} while (count < 10);' },
  { type: 'expression',  label: 'Promise all',         icon: '📦', color: '#cba6f7', description: 'Wait for many promises', expressionTemplate: 'const results = await Promise.all([promise1, promise2]);' },
  { type: 'expression',  label: 'Promise race',        icon: '🏁', color: '#f2cdcd', description: 'Use Promise.race', expressionTemplate: 'const winner = await Promise.race([promise1, promise2]);' },
  { type: 'expression',  label: 'Generator function',   icon: '🧵', color: '#f9e2af', description: 'Declare a generator', expressionTemplate: 'function* generator() {\n  yield 1;\n  yield 2;\n}' },
  { type: 'expression',  label: 'Custom snippet',       icon: '🛠️', color: '#89b4fa', description: 'Create your own code snippet', expressionTemplate: '/* custom JS code */' },
];

export class ScriptBuilder {
  private readonly container: HTMLElement;
  private scriptMode: ScriptMode | null = null;
  private scriptName = '';
  private blocks: ScriptBlock[] = [];
  private selectedBlockId: string | null = null;
  private draggedPaletteType: ScriptBlockType | null = null;
  private draggedPaletteExpression: string | null = null;
  private draggedBlockId: string | null = null;
  private aiProviders: AIProviderConfig[] = [];
  private selectedAIProviderId: string | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);
    this.container = container;
    this.loadAIProviders();
  }

  render(): void {
    clearElement(this.container);
    if (!this.scriptMode) {
      this.renderModeSelection();
    } else {
      this.renderBuilder();
    }
  }

  private renderModeSelection(): void {
    const page = el('div', { className: 'fb-type-selection' },
      el('div', { className: 'fb-type-header' },
        el('h1', {}, '✨ Script API Builder'),
        el('p', { className: 'fb-type-subtitle' }, 'Drag code blocks into place and generate JavaScript output for ItsAstralMC.')),
      el('div', { className: 'fb-type-cards' },
        el('div', {
          className: 'fb-type-card fb-card-action',
          onclick: () => this.selectScriptMode('module'),
        },
          el('div', { className: 'fb-card-icon' }, '📦'),
          el('h2', {}, 'Module Script'),
          el('p', {}, 'Top-level script with imports and statements'),
          el('ul', {},
            el('li', {}, '✔ Imports'),
            el('li', {}, '✔ Variables'),
            el('li', {}, '✔ Expressions'),
            el('li', {}, '✔ Console logs'),
          ),
        ),
        el('div', {
          className: 'fb-type-card fb-card-modal',
          onclick: () => this.selectScriptMode('function'),
        },
          el('div', { className: 'fb-card-icon' }, 'ƒ'),
          el('h2', {}, 'Function Script'),
          el('p', {}, 'Build a reusable function body'),
          el('ul', {},
            el('li', {}, '✔ Parameters'),
            el('li', {}, '✔ Conditionals'),
            el('li', {}, '✔ Returns'),
            el('li', {}, '✔ Nested blocks'),
          ),
        ),
      ),
    );
    this.container.appendChild(page);
  }

  private selectScriptMode(mode: ScriptMode): void {
    this.scriptMode = mode;
    this.scriptName = mode === 'module' ? 'script' : 'myFunction';
    this.blocks = [];
    this.selectedBlockId = null;
    this.render();
  }

  private renderBuilder(): void {
    const layout = el('div', { className: 'fb-layout' });
    layout.appendChild(this.renderPalette());
    layout.appendChild(this.renderCanvas());
    layout.appendChild(this.renderProperties());
    this.container.appendChild(layout);
  }

  private renderPalette(): HTMLElement {
    const palette = el('div', { className: 'fb-palette' });
    palette.appendChild(el('div', { className: 'fb-palette-header' }, el('span', {}, '🧩 Blocks')));

    for (const item of PALETTE_ITEMS) {
      const paletteEl = el('div', {
        className: 'fb-palette-item',
        draggable: 'true',
        title: item.description,
        ondragstart: (e: DragEvent) => {
          this.draggedPaletteType = item.type;
          this.draggedPaletteExpression = item.expressionTemplate ?? null;
          this.draggedBlockId = null;
          e.dataTransfer!.effectAllowed = 'copy';
          e.dataTransfer!.setData('text/plain', item.type);
          (e.currentTarget as HTMLElement).classList.add('dragging');
        },
        ondragend: (e: DragEvent) => {
          this.draggedPaletteType = null;
          this.draggedPaletteExpression = null;
          (e.currentTarget as HTMLElement).classList.remove('dragging');
        },
      },
        el('span', {
          className: 'fb-palette-icon',
          style: `background: ${item.color}20; color: ${item.color}; border-color: ${item.color}40;`,
        }, item.icon),
        el('div', { className: 'fb-palette-label' },
          el('span', { className: 'fb-palette-name' }, item.label),
          el('span', { className: 'fb-palette-desc' }, item.description),
        ),
      );
      palette.appendChild(paletteEl);
    }

    palette.appendChild(el('div', { className: 'fb-palette-footer' },
      el('button', {
        className: 'btn',
        onclick: () => {
          this.scriptMode = null;
          this.render();
        },
      }, '← Back'),
      el('button', {
        className: 'btn secondary',
        onclick: () => this.openAISettings(),
      }, '🤖 AI Settings'),
    ));

    return palette;
  }

  private renderCanvas(): HTMLElement {
    const canvasContainer = el('div', { className: 'fb-canvas-container' });
    const toolbar = el('div', { className: 'fb-canvas-toolbar' },
      el('div', { className: 'fb-form-name-group' },
        el('label', {}, 'Script name:'),
        el('input', {
          type: 'text',
          value: this.scriptName,
          className: 'fb-form-name-input',
          placeholder: this.scriptMode === 'function' ? 'myFunction' : 'script',
          oninput: (e: Event) => {
            this.scriptName = (e.target as HTMLInputElement).value.trim() || this.scriptName;
          },
          onblur: () => this.render(),
        }),
        el('span', { className: 'fb-form-type-badge' },
          this.scriptMode === 'function' ? 'ƒ Function' : '📦 Module'
        ),
      ),
      el('div', { className: 'fb-canvas-actions' },
        el('button', {
          className: 'btn',
          onclick: () => this.clearAll(),
        }, '🗑 Clear'),
        el('button', {
          className: 'btn secondary',
          onclick: () => this.generateAIContent(),
        }, '🤖 Generate AI Code'),
        el('label', { className: 'btn' },
          '📂 Import JS',
          el('input', {
            type: 'file',
            accept: '.js',
            className: 'hidden-input',
            onchange: (e: Event) => this.handleImportJS(e),
          }),
        ),
        el('button', {
          className: 'btn primary',
          onclick: () => this.exportScript(),
        }, '📦 Export JS'),
      ),
    );
    canvasContainer.appendChild(toolbar);

    const canvasScroll = el('div', { className: 'fb-canvas-scroll' });
    const canvas = el('div', { className: 'fb-canvas' });
    const formPreview = el('div', { className: 'fb-form-preview', style: 'width: 100%; min-height: 520px;' });
    formPreview.appendChild(el('div', { className: 'fb-form-title-bar' }, el('span', { className: 'fb-form-title-text' }, this.scriptName || 'Script')));

    const formBody = el('div', {
      className: 'fb-form-body',
      ondragover: (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = this.draggedPaletteType ? 'copy' : 'move';
        formBody.classList.add('fb-drop-active');
      },
      ondragleave: (e: DragEvent) => {
        if (!formBody.contains(e.relatedTarget as Node)) {
          formBody.classList.remove('fb-drop-active');
        }
      },
      ondrop: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        formBody.classList.remove('fb-drop-active');
        this.handleCanvasDrop(null);
      },
    });

    if (this.blocks.length === 0) {
      formBody.appendChild(el('div', { className: 'fb-drop-hint' },
        el('span', { className: 'fb-drop-hint-icon' }, '⬇'),
        el('span', {}, 'Drag blocks here'),
      ));
    } else {
      for (let i = 0; i < this.blocks.length; i++) {
        formBody.appendChild(this.renderCanvasBlock(this.blocks[i], i, null, null));
      }
    }

    formPreview.appendChild(formBody);
    canvas.appendChild(formPreview);
    canvasScroll.appendChild(canvas);
    canvasContainer.appendChild(canvasScroll);
    return canvasContainer;
  }

  private renderCanvasBlock(
    block: ScriptBlock,
    _index: number,
    parentId: string | null,
    _parentType: ScriptBlockType | null = null
  ): HTMLElement {
    const isSelected = this.selectedBlockId === block.id;
    const isContainer = block.type === 'function' || block.type === 'if';

    const wrapper = el('div', {
      className: `fb-canvas-element fb-el-${block.type}${isSelected ? ' fb-selected' : ''}`,
      style: 'width: 100%; min-height: 64px;',
      draggable: 'true',
      onclick: (e: Event) => {
        e.stopPropagation();
        this.selectedBlockId = block.id;
        this.render();
      },
      ondragstart: (e: DragEvent) => {
        e.stopPropagation();
        this.draggedBlockId = block.id;
        this.draggedPaletteType = null;
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', block.id);
        setTimeout(() => (e.target as HTMLElement).classList.add('fb-dragging'), 0);
      },
      ondragend: (e: DragEvent) => {
        this.draggedBlockId = null;
        (e.currentTarget as HTMLElement).classList.remove('fb-dragging');
      },
      ondragover: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.draggedBlockId !== block.id) {
          (e.currentTarget as HTMLElement).classList.add('fb-drag-over');
        }
      },
      ondragleave: (e: DragEvent) => {
        (e.currentTarget as HTMLElement).classList.remove('fb-drag-over');
      },
      ondrop: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLElement).classList.remove('fb-drag-over');
        if (isContainer) {
          this.handleCanvasDrop(block.id);
        } else {
          this.handleReorderDrop(block.id, parentId);
        }
      },
    });

    wrapper.appendChild(this.renderBlockVisual(block));

    const moveBar = el('div', { className: 'fb-element-move' },
      el('button', {
        className: 'fb-move-btn',
        title: 'Move up',
        onclick: (e: Event) => { e.stopPropagation(); this.moveElement(block.id, parentId, -1); },
      }, '▲'),
      el('button', {
        className: 'fb-move-btn',
        title: 'Move down',
        onclick: (e: Event) => { e.stopPropagation(); this.moveElement(block.id, parentId, 1); },
      }, '▼'),
      el('button', {
        className: 'fb-move-btn fb-delete-btn',
        title: 'Delete',
        onclick: (e: Event) => { e.stopPropagation(); this.removeBlock(block.id); },
      }, '✕'),
    );
    wrapper.appendChild(moveBar);

    if (isContainer) {
      const childZone = el('div', {
        className: 'fb-container-children fb-children-stack',
        ondragover: (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer!.dropEffect = this.draggedPaletteType ? 'copy' : 'move';
          childZone.classList.add('fb-drop-active');
        },
        ondragleave: (e: DragEvent) => {
          if (!childZone.contains(e.relatedTarget as Node)) {
            childZone.classList.remove('fb-drop-active');
          }
        },
        ondrop: (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          childZone.classList.remove('fb-drop-active');
          this.handleCanvasDrop(block.id);
        },
      });

      if (block.children.length === 0) {
        childZone.appendChild(el('div', { className: 'fb-drop-hint small' }, el('span', {}, 'Drop blocks here')));
      } else {
        for (let i = 0; i < block.children.length; i++) {
          childZone.appendChild(this.renderCanvasBlock(block.children[i], i, block.id, block.type));
        }
      }

      wrapper.appendChild(childZone);
    }

    return wrapper;
  }

  private renderBlockVisual(block: ScriptBlock): HTMLElement {
    const paletteItem = PALETTE_ITEMS.find((item) => item.type === block.type);
    const color = paletteItem?.color ?? '#585b70';

    const header = el('div', { className: 'fb-vis-header' },
      el('span', { style: `color: ${color}` }, `${paletteItem?.icon ?? '?'} ${paletteItem?.label ?? block.type}`),
    );

    const details = el('div', { className: 'fb-vis-block-details' });
    switch (block.type) {
      case 'import':
        details.appendChild(el('span', {}, `from '${block.path ?? 'module'}'`));
        break;
      case 'variable':
        details.appendChild(el('span', {}, `${block.variableName ?? 'myVar'} = ${block.value ?? 'undefined'}`));
        break;
      case 'function':
        details.appendChild(el('span', {}, `function ${block.functionName ?? 'myFunction'}(${block.params ?? ''})`));
        break;
      case 'if':
        details.appendChild(el('span', {}, `if (${block.condition ?? 'true'})`));
        break;
      case 'console_log':
        details.appendChild(el('span', {}, `console.log(${block.message ?? '""'})`));
        break;
      case 'return':
        details.appendChild(el('span', {}, `return ${block.expression ?? 'undefined'}`));
        break;
      case 'expression':
        details.appendChild(el('span', {}, block.expression ?? '/* code */'));
        break;
    }

    return el('div', { className: 'fb-vis-block' }, header, details);
  }

  private renderProperties(): HTMLElement {
    const panel = el('div', { className: 'fb-properties' });
    panel.appendChild(el('div', { className: 'fb-properties-header' }, el('span', {}, '⚙ Properties')));
    const selected = this.findBlock(this.selectedBlockId);
    if (!selected) {
      panel.appendChild(el('div', { className: 'fb-props-empty' }, el('span', {}, 'Click a block on the canvas to edit its properties')));
      return panel;
    }

    const body = el('div', { className: 'fb-props-body' });
    body.appendChild(el('div', { className: 'fb-prop-type' },
      el('span', { className: 'fb-prop-type-badge', style: `background: ${PALETTE_ITEMS.find((i) => i.type === selected.type)?.color ?? '#585b70'}30; color: ${PALETTE_ITEMS.find((i) => i.type === selected.type)?.color ?? '#cdd6f4'}; border-color: ${PALETTE_ITEMS.find((i) => i.type === selected.type)?.color ?? '#585b70'}50;`, },
        `${PALETTE_ITEMS.find((i) => i.type === selected.type)?.icon ?? '?'} ${PALETTE_ITEMS.find((i) => i.type === selected.type)?.label ?? selected.type}`),
    ));

    if (selected.type === 'import') {
      body.appendChild(this.renderPropField('Module path', 'path', el('input', {
        type: 'text',
        value: selected.path ?? '',
        className: 'fb-prop-input',
        placeholder: './module',
        oninput: (e: Event) => { selected.path = (e.target as HTMLInputElement).value; },
        onblur: () => this.render(),
      })));
      body.appendChild(this.renderPropField('Import as', 'variableName', el('input', {
        type: 'text',
        value: selected.variableName ?? '',
        className: 'fb-prop-input',
        placeholder: 'moduleName',
        oninput: (e: Event) => { selected.variableName = (e.target as HTMLInputElement).value; },
        onblur: () => this.render(),
      })));
    }

    if (selected.type === 'variable') {
      body.appendChild(this.renderPropField('Variable name', 'variableName', el('input', {
        type: 'text',
        value: selected.variableName ?? '',
        className: 'fb-prop-input',
        placeholder: 'myVar',
        oninput: (e: Event) => { selected.variableName = (e.target as HTMLInputElement).value; },
        onblur: () => this.render(),
      })));
      body.appendChild(this.renderPropField('Value', 'value', el('input', {
        type: 'text',
        value: selected.value ?? '',
        className: 'fb-prop-input',
        placeholder: '42',
        oninput: (e: Event) => { selected.value = (e.target as HTMLInputElement).value; },
        onblur: () => this.render(),
      })));
    }

    if (selected.type === 'function') {
      body.appendChild(this.renderPropField('Function name', 'functionName', el('input', {
        type: 'text',
        value: selected.functionName ?? '',
        className: 'fb-prop-input',
        placeholder: 'myFunction',
        oninput: (e: Event) => { selected.functionName = (e.target as HTMLInputElement).value; },
        onblur: () => this.render(),
      })));
      body.appendChild(this.renderPropField('Parameters', 'params', el('input', {
        type: 'text',
        value: selected.params ?? '',
        className: 'fb-prop-input',
        placeholder: 'arg1, arg2',
        oninput: (e: Event) => { selected.params = (e.target as HTMLInputElement).value; },
        onblur: () => this.render(),
      })));
    }

    if (selected.type === 'if') {
      body.appendChild(this.renderPropField('Condition', 'condition', el('input', {
        type: 'text',
        value: selected.condition ?? '',
        className: 'fb-prop-input',
        placeholder: 'x > 0',
        oninput: (e: Event) => { selected.condition = (e.target as HTMLInputElement).value; },
        onblur: () => this.render(),
      })));
    }

    if (selected.type === 'console_log') {
      body.appendChild(this.renderPropField('Message', 'message', el('input', {
        type: 'text',
        value: selected.message ?? '',
        className: 'fb-prop-input',
        placeholder: 'Hello world',
        oninput: (e: Event) => { selected.message = (e.target as HTMLInputElement).value; },
        onblur: () => this.render(),
      })));
    }

    if (selected.type === 'return') {
      body.appendChild(this.renderPropField('Expression', 'expression', el('input', {
        type: 'text',
        value: selected.expression ?? '',
        className: 'fb-prop-input',
        placeholder: 'value',
        oninput: (e: Event) => { selected.expression = (e.target as HTMLInputElement).value; },
        onblur: () => this.render(),
      })));
    }

    if (selected.type === 'expression') {
      body.appendChild(this.renderPropField('Code', 'expression', el('textarea', {
        className: 'fb-prop-input',
        rows: '6',
        value: selected.expression ?? '',
        placeholder: 'const x = 1;',
        oninput: (e: Event) => { selected.expression = (e.target as HTMLTextAreaElement).value; },
        onblur: () => this.render(),
      })));
    }

    panel.appendChild(body);
    panel.appendChild(el('div', { className: 'fb-props-preview' },
      el('button', {
        className: 'btn small',
        onclick: () => this.previewBlockCode(selected),
      }, '{ } View code'),
    ));
    return panel;
  }

  private renderPropField(label: string, _key: string, input: HTMLElement): HTMLElement {
    return el('div', { className: 'fb-prop-row' },
      el('label', { className: 'fb-prop-label' }, label),
      el('div', { className: 'fb-prop-value' }, input),
    );
  }

  private handleCanvasDrop(targetId: string | null): void {
    if (this.draggedPaletteType) {
      const newBlock = createScriptBlock(this.draggedPaletteType, {
        expression: this.draggedPaletteExpression ?? undefined,
      });
      if (targetId) {
        const parent = this.findBlock(targetId);
        parent?.children.push(newBlock);
      } else {
        this.blocks.push(newBlock);
      }
      this.selectedBlockId = newBlock.id;
      this.draggedPaletteType = null;
      this.draggedPaletteExpression = null;
      this.render();
    } else if (this.draggedBlockId) {
      if (this.draggedBlockId === targetId) return;
      const block = this.findBlock(this.draggedBlockId);
      if (!block) return;
      if (targetId && this.isDescendant(this.draggedBlockId, targetId)) return;
      this.removeBlockFromTree(this.draggedBlockId);
      if (targetId) {
        const parent = this.findBlock(targetId);
        parent?.children.push(block);
      } else {
        this.blocks.push(block);
      }
      this.draggedBlockId = null;
      this.render();
    }
  }

  private handleReorderDrop(beforeId: string, parentId: string | null): void {
    if (!this.draggedBlockId && !this.draggedPaletteType) return;

    let targetBlock: ScriptBlock | null = null;
    if (this.draggedPaletteType) {
      targetBlock = createScriptBlock(this.draggedPaletteType);
      this.draggedPaletteType = null;
    } else if (this.draggedBlockId) {
      if (this.draggedBlockId === beforeId) return;
      const found = this.findBlock(this.draggedBlockId);
      if (!found) return;
      this.removeBlockFromTree(this.draggedBlockId);
      targetBlock = found;
      this.draggedBlockId = null;
    }
    if (!targetBlock) return;

    const siblings = parentId ? this.findBlock(parentId)?.children : this.blocks;
    if (!siblings) return;
    const idx = siblings.findIndex((item) => item.id === beforeId);
    if (idx >= 0) {
      siblings.splice(idx, 0, targetBlock);
    } else {
      siblings.push(targetBlock);
    }
    this.selectedBlockId = targetBlock.id;
    this.render();
  }

  private removeBlock(id: string): void {
    this.removeBlockFromTree(id);
    if (this.selectedBlockId === id) this.selectedBlockId = null;
    this.render();
  }

  private moveElement(id: string, parentId: string | null, direction: number): void {
    const siblings = parentId ? this.findBlock(parentId)?.children : this.blocks;
    if (!siblings) return;
    const idx = siblings.findIndex((item) => item.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= siblings.length) return;
    [siblings[idx], siblings[newIdx]] = [siblings[newIdx], siblings[idx]];
    this.render();
  }

  private findBlock(id: string | null): ScriptBlock | null {
    if (!id) return null;
    return this.findInTree(this.blocks, id);
  }

  private findInTree(list: ScriptBlock[], id: string): ScriptBlock | null {
    for (const block of list) {
      if (block.id === id) return block;
      const found = this.findInTree(block.children, id);
      if (found) return found;
    }
    return null;
  }

  private removeBlockFromTree(id: string): boolean {
    if (this.removeFromList(this.blocks, id)) return true;
    return false;
  }

  private removeFromList(list: ScriptBlock[], id: string): boolean {
    const idx = list.findIndex((item) => item.id === id);
    if (idx >= 0) {
      list.splice(idx, 1);
      return true;
    }
    for (const item of list) {
      if (this.removeFromList(item.children, id)) return true;
    }
    return false;
  }

  private isDescendant(parentId: string, childId: string): boolean {
    const parent = this.findBlock(parentId);
    if (!parent) return false;
    return this.findInTree(parent.children, childId) !== null;
  }

  private clearAll(): void {
    this.blocks = [];
    this.selectedBlockId = null;
    this.render();
  }

  private loadAIProviders(): void {
    const saved = localStorage.getItem(AI_PROVIDERS_STORAGE_KEY);
    try {
      if (saved) {
        this.aiProviders = JSON.parse(saved) as AIProviderConfig[];
      } else {
        this.aiProviders = DEFAULT_AI_PROVIDERS;
      }
    } catch {
      this.aiProviders = DEFAULT_AI_PROVIDERS;
    }
    if (this.aiProviders.length > 0) {
      this.selectedAIProviderId = this.aiProviders[0].id;
    }
  }

  private saveAIProviders(): void {
    localStorage.setItem(AI_PROVIDERS_STORAGE_KEY, JSON.stringify(this.aiProviders));
  }

  private openAISettings(): void {
    this.loadAIProviders();
    const content = el('div', { className: 'ai-settings' });
    const providerSelect = el('select', {
      className: 'fb-prop-input',
      value: this.selectedAIProviderId ?? undefined,
      onchange: (e: Event) => {
        this.selectedAIProviderId = (e.target as HTMLSelectElement).value;
        this.renderAIProviderDetails(content);
      },
    });

    for (const provider of this.aiProviders) {
      providerSelect.appendChild(el('option', { value: provider.id }, provider.name));
    }
    if (this.selectedAIProviderId) {
      providerSelect.value = this.selectedAIProviderId;
    }

    const providerDetails = el('div', { className: 'ai-provider-details' });
    const renderContent = () => {
      clearElement(providerDetails);
      providerDetails.appendChild(el('div', { className: 'fb-prop-row' },
        el('label', { className: 'fb-prop-label' }, 'Provider'),
        providerSelect,
      ));
      providerDetails.appendChild(this.renderAIProviderFields());
      providerDetails.appendChild(el('div', { className: 'fb-prop-row' },
        el('button', {
          className: 'btn',
          onclick: () => this.addAIProvider(renderContent),
        }, '➕ Add provider'),
        el('button', {
          className: 'btn secondary',
          onclick: () => this.removeSelectedAIProvider(renderContent),
        }, '🗑 Remove provider'),
      ));
    };

    content.appendChild(providerDetails);
    renderContent();

    showModal('🤖 AI Settings', content);
  }

  private renderAIProviderDetails(content: HTMLElement): void {
    const providerDetails = content.querySelector('.ai-provider-details');
    if (providerDetails) {
      clearElement(providerDetails);
      providerDetails.appendChild(this.renderAIProviderFields());
    }
  }

  private renderAIProviderFields(): HTMLElement {
    const selected = this.aiProviders.find((provider) => provider.id === this.selectedAIProviderId) ?? this.aiProviders[0];
    if (!selected) {
      const container = el('div', {}, 'No AI provider configured.');
      return container;
    }

    const container = el('div', { className: 'ai-provider-fields' });
    container.appendChild(this.renderPropField('Name', 'name', el('input', {
      type: 'text',
      value: selected.name,
      className: 'fb-prop-input',
      oninput: (e: Event) => { selected.name = (e.target as HTMLInputElement).value; },
    })));
    container.appendChild(this.renderPropField('Endpoint', 'endpoint', el('input', {
      type: 'text',
      value: selected.endpoint,
      className: 'fb-prop-input',
      oninput: (e: Event) => { selected.endpoint = (e.target as HTMLInputElement).value; },
    })));
    container.appendChild(this.renderPropField('API Key', 'apiKey', el('input', {
      type: 'password',
      value: selected.apiKey,
      className: 'fb-prop-input',
      placeholder: 'sk-... or custom key',
      oninput: (e: Event) => { selected.apiKey = (e.target as HTMLInputElement).value; },
    })));
    container.appendChild(this.renderPropField('Model', 'model', el('input', {
      type: 'text',
      value: selected.model ?? '',
      className: 'fb-prop-input',
      placeholder: 'gpt-4o-mini',
      oninput: (e: Event) => { selected.model = (e.target as HTMLInputElement).value; },
    })));
    container.appendChild(this.renderPropField('Request template', 'requestTemplate', el('textarea', {
      className: 'fb-prop-input',
      rows: '4',
      value: selected.requestTemplate ?? '',
      placeholder: 'Optional raw request JSON template',
      oninput: (e: Event) => { selected.requestTemplate = (e.target as HTMLTextAreaElement).value || undefined; },
    })));
    container.appendChild(this.renderPropField('Response path', 'responsePath', el('input', {
      type: 'text',
      value: selected.responsePath ?? '',
      className: 'fb-prop-input',
      placeholder: 'choices[0].message.content',
      oninput: (e: Event) => { selected.responsePath = (e.target as HTMLInputElement).value || undefined; },
    })));
    container.appendChild(el('div', { className: 'fb-prop-row' },
      el('button', {
        className: 'btn primary',
        onclick: () => {
          this.saveAIProviders();
          showToast('AI providers saved', 'info');
          this.render();
        },
      }, 'Save settings'),
    ));

    return container;
  }

  private addAIProvider(renderContent: () => void): void {
    const newProvider: AIProviderConfig = {
      id: `provider_${Date.now()}`,
      name: 'New AI Provider',
      endpoint: 'https://api.example.com/v1/completions',
      apiKey: '',
      type: 'generic',
      model: '',
    };
    this.aiProviders.push(newProvider);
    this.selectedAIProviderId = newProvider.id;
    renderContent();
  }

  private removeSelectedAIProvider(renderContent: () => void): void {
    if (this.aiProviders.length <= 1) {
      showToast('At least one AI provider must remain', 'warning');
      return;
    }
    this.aiProviders = this.aiProviders.filter((provider) => provider.id !== this.selectedAIProviderId);
    this.selectedAIProviderId = this.aiProviders[0]?.id ?? null;
    this.saveAIProviders();
    renderContent();
  }

  private async generateAIContent(): Promise<void> {
    this.loadAIProviders();
    const provider = this.aiProviders.find((item) => item.id === this.selectedAIProviderId) ?? this.aiProviders[0];
    if (!provider || !provider.apiKey) {
      showToast('Add an AI provider and enter an API key first.', 'warning');
      this.openAISettings();
      return;
    }

    const prompt = `Generate a JavaScript snippet for an ItsAstralMC Script API editor. Please provide code only, no explanation, using modern JavaScript. The script should be suitable for ${this.scriptMode === 'function' ? 'a function body' : 'a module script'} and include imports, variables, or helper code if needed.`;
    const loading = el('div', { className: 'ai-loading' }, 'Generating AI code...');
    showModal('🤖 AI Code Generation', loading);

    try {
      const responseText = await this.requestAIResponse(provider, prompt);
      closeModal();
      const generatedBlock = createScriptBlock('expression', { expression: responseText });
      this.blocks.push(generatedBlock);
      this.selectedBlockId = generatedBlock.id;
      this.render();
      showToast('AI-generated code added to canvas', 'info');
    } catch (err) {
      closeModal();
      showToast(`AI request failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }

  private async requestAIResponse(provider: AIProviderConfig, prompt: string): Promise<string> {
    const requestBody: Record<string, unknown> = provider.type === 'openai'
      ? {
          model: provider.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a JavaScript code assistant.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 512,
          temperature: 0.3,
        }
      : {
          prompt,
          model: provider.model || 'default',
          max_tokens: 512,
          temperature: 0.3,
        };

    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AI request failed (${response.status}): ${body}`);
    }
    const data = await response.json();
    const path = provider.responsePath?.split('.') ?? ['choices', '0', 'message', 'content'];
    let value: any = data;
    for (const segment of path) {
      if (value && typeof value === 'object' && segment in value) {
        value = value[segment];
      } else {
        value = null;
        break;
      }
    }
    if (typeof value !== 'string') {
      throw new Error('Could not extract AI text from the response.');
    }
    return value.trim();
  }

  private exportScript(): void {
    if (this.blocks.length === 0) {
      showToast('Add some blocks to the script first!', 'warning');
      return;
    }
    const code = generateScript(this.scriptName, this.scriptMode!, this.blocks);
    const content = el('div', { className: 'fb-export-modal' },
      el('h3', {}, `${this.scriptName || 'script'}.js`),
      el('p', { className: 'fb-export-desc' }, 'Download or copy your generated JavaScript code.'),
      el('textarea', {
        className: 'fb-export-code',
        rows: '18',
        value: code,
        readonly: 'true',
        onclick: (e: Event) => (e.target as HTMLTextAreaElement).select(),
      }),
      el('div', { className: 'fb-export-actions' },
        el('button', {
          className: 'btn primary',
          onclick: () => {
            this.downloadFile(`${this.scriptName || 'script'}.js`, code);
            showToast('File downloaded!', 'info');
          },
        }, '💾 Download JS'),
        el('button', {
          className: 'btn',
          onclick: () => {
            navigator.clipboard.writeText(code);
            showToast('Copied to clipboard!', 'info');
          },
        }, '📋 Copy All'),
        el('button', {
          className: 'btn',
          onclick: () => closeModal(),
        }, 'Close'),
      ),
    );
    showModal('📦 Export Script', content);
  }

  private downloadFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private previewBlockCode(block: ScriptBlock): void {
    const code = generateScript(this.scriptName, this.scriptMode!, [block]);
    const content = el('div', {},
      el('textarea', {
        className: 'fb-export-code',
        rows: '16',
        value: code,
        readonly: 'true',
      }),
    );
    showModal(`Code: ${block.type}`, content);
  }

  private async handleImportJS(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const block = createScriptBlock('expression', { expression: text });
      this.blocks.push(block);
      this.selectedBlockId = block.id;
      this.render();
      showToast(`Imported JS from ${file.name}`, 'info');
    } catch (err) {
      showToast(`Import error: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    input.value = '';
  }

  private async requestAIResponse(provider: AIProviderConfig, prompt: string): Promise<string> {
    const requestBody: Record<string, unknown> = provider.type === 'openai'
      ? {
          model: provider.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a JavaScript code assistant.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 512,
          temperature: 0.3,
        }
      : {
          prompt,
          model: provider.model || 'default',
          max_tokens: 512,
          temperature: 0.3,
        };

    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AI request failed (${response.status}): ${body}`);
    }
    const data = await response.json();
    const path = provider.responsePath?.split('.') ?? ['choices', '0', 'message', 'content'];
    let value: any = data;
    for (const segment of path) {
      if (value && typeof value === 'object' && segment in value) {
        value = value[segment];
      } else {
        value = null;
        break;
      }
    }
    if (typeof value !== 'string') {
      throw new Error('Could not extract AI text from the response.');
    }
    return value.trim();
  }

  private async handleImportJS(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const block = createScriptBlock('expression', { expression: text });
      this.blocks.push(block);
      this.selectedBlockId = block.id;
      this.render();
      showToast(`Imported JS from ${file.name}`, 'info');
    } catch (err) {
      showToast(`Import error: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
    input.value = '';
  }
}