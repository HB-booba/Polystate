import { Node, Project } from 'ts-morph';

const project = new Project({ addFilesFromTsConfig: false, skipFileDependencyResolution: true });
const sf = project.addSourceFileAtPath('examples/react-todo-generated/store.definition.ts');

let found = null;
sf.forEachDescendant((node) => {
    if (found) return;
    if (!Node.isObjectLiteralExpression(node)) return;
    const keys = new Set(node.getProperties().filter(Node.isPropertyAssignment).map(p => p.getName()));
    if (keys.has('name') && keys.has('initialState') && keys.has('actions')) found = node;
});

if (!found) { console.log('NOT FOUND'); process.exit(1); }

const nameP = found.getProperties().find(p => Node.isPropertyAssignment(p) && p.getName() === 'name');
const initP = found.getProperties().find(p => Node.isPropertyAssignment(p) && p.getName() === 'initialState');
const actP = found.getProperties().find(p => Node.isPropertyAssignment(p) && p.getName() === 'actions');

console.log('name:', nameP?.getInitializer()?.getText());

// Fields
const initObj = initP?.getInitializer();
if (Node.isObjectLiteralExpression(initObj)) {
    for (const prop of initObj.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
            const init = prop.getInitializer();
            let typeAnn = null;
            if (Node.isAsExpression(init)) typeAnn = init.getTypeNode()?.getText();
            console.log(`field: ${prop.getName()}, type: ${typeAnn ?? 'inferred'}`);
        }
    }
}

// Actions
const actObj = actP?.getInitializer();
if (Node.isObjectLiteralExpression(actObj)) {
    for (const prop of actObj.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
            const init = prop.getInitializer();
            if (Node.isArrowFunction(init)) {
                const params = init.getParameters();
                const payloadParam = params[1];
                const typeNode = payloadParam?.getTypeNode();
                const bodyText = init.getBody().getText().slice(0, 80);
                console.log(`action: ${prop.getName()}, payloadType: ${typeNode?.getText() ?? 'null'}, body-start: ${bodyText}`);
            }
        }
    }
}
