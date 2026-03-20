import { parseDefinitionFile } from './packages/cli/src/ast-parser.js';
import { generateHooksFromAST, generateReduxStoreFromAST } from './packages/generator-react/src/generator.js';

const ast = parseDefinitionFile('/Users/abdelhakhamri/Documents/Projects/polystate/examples/react-todo-generated/store.definition.ts');
console.log('=== StoreAST ===');
console.log('name:', ast.name);
ast.fields.forEach(f => console.log('field:', f.name, '→', f.typeAnnotation ?? `inferred(${f.initialValue})`));
ast.actions.forEach(a => console.log('action:', a.name, '→', a.payloadType ?? 'no payload'));

console.log('\n=== Generated store.ts (first 40 lines) ===');
const store = generateReduxStoreFromAST(ast);
console.log(store.split('\n').slice(0, 40).join('\n'));

console.log('\n=== Generated hooks.ts (first 30 lines) ===');
const hooks = generateHooksFromAST(ast);
console.log(hooks.split('\n').slice(0, 30).join('\n'));
