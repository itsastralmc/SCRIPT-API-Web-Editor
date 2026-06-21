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

interface PaletteItem {
  type: ScriptBlockType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'import',      label: 'Import',       icon: '📦', color: '#89b4fa', description: 'Import a module or package' },
  { type: 'variable',    label: 'Variable',     icon: '🔧', color: '#a6e3a1', description: 'Declare a constant or variable' },
  { type: 'function',    label: 'Function',     icon: 'ƒ', color: '#cba6f7', description: 'Define a reusable function' },
  { type: 'if',          label: 'If',           icon: '❓', color: '#fab387', description: 'Conditional execution block' },
  { type: 'console_log', label: 'Console Log',  icon: '🖨️', color: '#94e2d5', description: 'Print a message to the console' },
  { type: 'return',      label: 'Return',       icon: '⏎', color: '#f9e2af', description: 'Return a value from a function' },
  { type: 'expression',  label: 'Expression',   icon: '✱', color: '#f5c2e7', description: 'Write a custom JS expression' },
];

export class ScriptBuilder {
  private readonly container: HTMLElement;
  private scriptMode: ScriptMode | null = null;
  private scriptName = '';
  private blocks: ScriptBlock[] = [];
  private selectedBlockId: string | null = null;
  private draggedPaletteType: ScriptBlockType | null = null;
  private draggedBlockId: string | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);
    this.container = container;
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
          this.draggedBlockId = null;
          e.dataTransfer!.effectAllowed = 'copy';
          e.dataTransfer!.setData('text/plain', item.type);
          (e.currentTarget as HTMLElement).classList.add('dragging');
        },
        ondragend: (e: DragEvent) => {
          this.draggedPaletteType = null;
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
    parentType: ScriptBlockType | null = null
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
      const newBlock = createScriptBlock(this.draggedPaletteType);
      if (targetId) {
        const parent = this.findBlock(targetId);
        parent?.children.push(newBlock);
      } else {
        this.blocks.push(newBlock);
      }
      this.selectedBlockId = newBlock.id;
      this.draggedPaletteType = null;
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
}
