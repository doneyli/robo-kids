'use client';
import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

// Blockly custom block definitions
const ROBOT_BLOCKS = [
  {
    type: 'robot_wave',
    message0: '👋 Wave %1 hand',
    args0: [{ type: 'field_dropdown', name: 'HAND', options: [['right', 'right'], ['left', 'left']] }],
    previousStatement: null,
    nextStatement: null,
    colour: '#f59e0b',
    tooltip: 'Make Robo wave!',
  },
  {
    type: 'robot_look',
    message0: '👀 Look %1',
    args0: [{ type: 'field_dropdown', name: 'DIRECTION', options: [['left','left'],['right','right'],['up','up'],['down','down'],['center','center']] }],
    previousStatement: null,
    nextStatement: null,
    colour: '#3b82f6',
    tooltip: 'Move Robo\'s head!',
  },
  {
    type: 'robot_speak',
    message0: '💬 Say %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Hello!' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#10b981',
    tooltip: 'Make Robo talk!',
  },
  {
    type: 'robot_express',
    message0: '😊 Show face %1',
    args0: [{ type: 'field_dropdown', name: 'EMOTION', options: [['happy','happy'],['excited','excited'],['sad','sad'],['thinking','thinking'],['surprised','surprised'],['neutral','neutral']] }],
    previousStatement: null,
    nextStatement: null,
    colour: '#ec4899',
    tooltip: 'Change Robo\'s expression!',
  },
  {
    type: 'robot_dance',
    message0: '💃 Dance %1 style',
    args0: [{ type: 'field_dropdown', name: 'STYLE', options: [['happy','happy'],['robot','robot'],['wave','wave']] }],
    previousStatement: null,
    nextStatement: null,
    colour: '#8b5cf6',
    tooltip: 'Make Robo dance!',
  },
  {
    type: 'robot_nod',
    message0: '✅ Nod head %1 times',
    args0: [{ type: 'field_number', name: 'TIMES', value: 2, min: 1, max: 5 }],
    previousStatement: null,
    nextStatement: null,
    colour: '#06b6d4',
    tooltip: 'Make Robo nod!',
  },
  {
    type: 'robot_blink',
    message0: '👁️ Blink %1 times',
    args0: [{ type: 'field_number', name: 'COUNT', value: 3, min: 1, max: 10 }],
    previousStatement: null,
    nextStatement: null,
    colour: '#64748b',
    tooltip: 'Make Robo blink!',
  },
  {
    type: 'robot_wake_up',
    message0: '☀️ Wake up!',
    previousStatement: null,
    nextStatement: null,
    colour: '#f59e0b',
    tooltip: 'Wake Robo up!',
  },
];

// Generate robot commands from blocks
function generateCommands(Blockly: any, workspace: any): Array<{action: string; params?: Record<string, unknown>}> {
  const commands: Array<{action: string; params?: Record<string, unknown>}> = [];

  function processBlock(block: any) {
    if (!block) return;
    switch (block.type) {
      case 'robot_wave':
        commands.push({ action: 'wave', params: { hand: block.getFieldValue('HAND') } });
        break;
      case 'robot_look':
        commands.push({ action: 'look', params: { direction: block.getFieldValue('DIRECTION') } });
        break;
      case 'robot_speak':
        commands.push({ action: 'speak', params: { text: block.getFieldValue('TEXT') } });
        break;
      case 'robot_express':
        commands.push({ action: 'express', params: { emotion: block.getFieldValue('EMOTION') } });
        break;
      case 'robot_dance':
        commands.push({ action: 'dance', params: { style: block.getFieldValue('STYLE') } });
        break;
      case 'robot_nod':
        commands.push({ action: 'nod', params: { times: Number(block.getFieldValue('TIMES')) } });
        break;
      case 'robot_blink':
        commands.push({ action: 'blink', params: { count: Number(block.getFieldValue('COUNT')) } });
        break;
      case 'robot_wake_up':
        commands.push({ action: 'wake_up' });
        break;
      case 'controls_repeat_ext':
      case 'controls_repeat': {
        const times = block.getField('TIMES')?.getValue() ?? block.getInputTargetBlock('TIMES')?.getFieldValue('NUM') ?? 1;
        const inner = block.getInputTargetBlock('DO');
        const before = commands.length;
        processBlock(inner);
        const repeated = commands.splice(before);
        for (let i = 0; i < Number(times); i++) commands.push(...repeated);
        break;
      }
    }
    // Process next block in sequence
    processBlock(block.getNextBlock());
  }

  const topBlocks = workspace.getTopBlocks(true);
  topBlocks.forEach(processBlock);
  return commands;
}

export interface BlocklyEditorHandle {
  getCommands: () => Array<{action: string; params?: Record<string, unknown>}>;
  clearWorkspace: () => void;
}

interface BlocklyEditorProps {
  availableBlocks: string[];
  initialXml?: string;
}

const BlocklyEditor = forwardRef<BlocklyEditorHandle, BlocklyEditorProps>(
  function BlocklyEditor({ availableBlocks, initialXml }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<any>(null);
    const BlocklyRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      getCommands: () => {
        if (!workspaceRef.current || !BlocklyRef.current) return [];
        return generateCommands(BlocklyRef.current, workspaceRef.current);
      },
      clearWorkspace: () => {
        workspaceRef.current?.clear();
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      let workspace: any = null;

      async function initBlockly() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Blockly: any = await import('blockly');
        BlocklyRef.current = Blockly;

        // Register custom blocks
        ROBOT_BLOCKS.forEach(block => {
          if (!Blockly.Blocks[block.type]) {
            Blockly.Blocks[block.type] = {
              init: function(this: any) { this.jsonInit(block); },
            };
          }
        });

        // Build toolbox from availableBlocks
        const allBlockTypes = [
          'robot_wake_up', 'robot_wave', 'robot_look', 'robot_speak',
          'robot_express', 'robot_dance', 'robot_nod', 'robot_blink',
          'controls_repeat', 'controls_if',
        ];
        const blockTypes = availableBlocks.filter(b => allBlockTypes.includes(b));
        const toolboxXml = `<xml>
          <category name="🤖 Robot" colour="#f59e0b">
            ${blockTypes.filter(b => !b.startsWith('controls')).map(b => `<block type="${b}"></block>`).join('\n')}
          </category>
          ${blockTypes.includes('controls_repeat') ? `<category name="🔁 Loops" colour="#9b59b6">
            <block type="controls_repeat"><field name="TIMES">3</field></block>
          </category>` : ''}
          ${blockTypes.includes('controls_if') ? `<category name="⚡ Logic" colour="#e67e22">
            <block type="controls_if"></block>
          </category>` : ''}
        </xml>`;

        workspace = Blockly.inject(containerRef.current!, {
          toolbox: toolboxXml,
          scrollbars: true,
          trashcan: true,
          grid: { spacing: 20, length: 3, colour: '#f1f5f9', snap: true },
          theme: Blockly.Themes?.Classic ?? 'classic',
          move: { scrollbars: true, drag: true, wheel: true },
        });

        workspaceRef.current = workspace;

        if (initialXml) {
          try {
            // Blockly.Xml API varies by version — use any to avoid type errors
            const B = Blockly as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            const dom = B.Xml?.textToDom?.(initialXml);
            if (dom) B.Xml?.domToWorkspace?.(dom, workspace);
          } catch {
            // ignore malformed initial XML
          }
        }
      }

      initBlockly();

      return () => {
        workspace?.dispose();
        workspaceRef.current = null;
      };
    }, [availableBlocks, initialXml]);

    return (
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden border-2 border-blue-200 shadow-inner"
        style={{ height: '400px', background: '#f8fafc' }}
        aria-label="Blockly programming editor"
      />
    );
  }
);

export default BlocklyEditor;
