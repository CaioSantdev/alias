const DEFAULT_ALIASES = {
  "-bd": "Olá, bom dia! Irei realizar seu atendimento.",
  "-bt": "Olá, boa tarde! Irei realizar seu atendimento.",
  "-bn": "Olá, boa noite! Irei realizar seu atendimento."
};

let aliases = { ...DEFAULT_ALIASES };

chrome.storage.local.get({ aliases: DEFAULT_ALIASES }, (result) => {
  aliases = result.aliases || { ...DEFAULT_ALIASES };
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.aliases) {
    aliases = changes.aliases.newValue || {};
  }
});

function getAliasBeforeCursor(value, cursorPosition) {
  const beforeCursor = value.slice(0, cursorPosition);
  const match = beforeCursor.match(/(?:^|\s)(-[\w-]+)$/i);

  if (!match) return null;

  const alias = match[1].toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(aliases, alias)) return null;

  return {
    alias,
    start: cursorPosition - alias.length,
    end: cursorPosition
  };
}

function replaceInInput(element, delimiter) {
  const cursorPosition = element.selectionStart;
  if (cursorPosition === null || cursorPosition !== element.selectionEnd) return false;

  const found = getAliasBeforeCursor(element.value, cursorPosition);
  if (!found) return false;

  const replacement = aliases[found.alias];
  element.setRangeText(replacement + delimiter, found.start, found.end, "end");
  element.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

function getContentEditableTextBeforeCursor(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer) || !selection.isCollapsed) return null;

  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(element);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  return { range, text: beforeRange.toString() };
}

function replaceInContentEditable(element, delimiter) {
  const current = getContentEditableTextBeforeCursor(element);
  if (!current) return false;

  const found = getAliasBeforeCursor(current.text, current.text.length);
  if (!found) return false;

  const selection = window.getSelection();
  const replacementRange = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node;
  let remaining = found.alias.length;
  const endNode = current.range.startContainer.nodeType === Node.TEXT_NODE
    ? current.range.startContainer
    : null;
  let endOffset = current.range.startOffset;

  const textNodes = [];
  while ((node = walker.nextNode())) textNodes.push(node);

  for (let index = textNodes.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const textNode = textNodes[index];
    let limit = textNode === endNode ? endOffset : textNode.textContent.length;
    if (endNode && textNodes.indexOf(textNode) > textNodes.indexOf(endNode)) continue;
    const count = Math.min(remaining, limit);
    replacementRange.setStart(textNode, limit - count);
    if (remaining === count) {
      replacementRange.setEnd(textNode, limit);
      break;
    }
    remaining -= count;
  }

  if (remaining > 0) return false;

  replacementRange.deleteContents();
  replacementRange.insertNode(document.createTextNode(aliases[found.alias] + delimiter));
  replacementRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(replacementRange);
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  return true;
}

document.addEventListener("keydown", (event) => {
  if (![' ', "Enter", "Tab"].includes(event.key)) return;

  const target = event.target;
  const delimiter = event.key === "Enter" ? "\n" : event.key === "Tab" ? "\t" : " ";
  let replaced = false;

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    replaced = replaceInInput(target, delimiter);
  } else if (target instanceof HTMLElement && target.isContentEditable) {
    replaced = replaceInContentEditable(target, delimiter);
  }

  if (replaced) event.preventDefault();
}, true);
