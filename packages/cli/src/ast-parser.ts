/**
 * AST parser for Polystate store definition files.
 *
 * Uses ts-morph to read a TypeScript source file and extract a structured
 * StoreAST without executing any code at runtime. This makes the generator
 * robust against complex handler bodies (map/filter/ternaries) that the
 * old handler.toString() + regex approach could not handle correctly.
 */

import type { ActionAST, FieldAST, StoreAST } from '@polystate/definition';
import {
    Node,
    ObjectLiteralExpression,
    Project,
    PropertyAssignment,
    SourceFile,
    SyntaxKind,
} from 'ts-morph';

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a TypeScript store-definition file and return a StoreAST.
 *
 * @param filePath  Absolute path to the `.ts` definition file.
 * @returns StoreAST extracted from the first `StoreDefinition` object found.
 * @throws If no valid definition object can be located.
 */
export function parseDefinitionFile(filePath: string): StoreAST {
    const project = new Project({
        addFilesFromTsConfig: false,
        skipFileDependencyResolution: true,
        compilerOptions: {
            allowJs: true,
            resolveJsonModule: true,
            strict: false,
        },
    });

    const sourceFile = project.addSourceFileAtPath(filePath);

    const defObject = findStoreDefinitionObject(sourceFile);
    if (!defObject) {
        throw new Error(
            `Could not find a StoreDefinition object literal in "${filePath}". ` +
            `Make sure the file exports a StoreDefinition object with name, initialState, and actions properties.`
        );
    }

    return extractStoreAST(defObject);
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Locate the first object literal that has both `name`, `initialState`, and
 * `actions` properties — this is the StoreDefinition.
 */
function findStoreDefinitionObject(
    sourceFile: SourceFile
): ObjectLiteralExpression | null {
    let found: ObjectLiteralExpression | null = null;

    sourceFile.forEachDescendant((node) => {
        if (found) return; // already found
        if (!Node.isObjectLiteralExpression(node)) return;

        const props = node.getProperties();
        const keys = new Set(
            props
                .filter(Node.isPropertyAssignment)
                .map((p) => (p as PropertyAssignment).getName())
        );

        if (keys.has('name') && keys.has('initialState') && keys.has('actions')) {
            found = node as ObjectLiteralExpression;
        }
    });

    return found;
}

/**
 * Extract the structured StoreAST from an ObjectLiteralExpression that
 * represents a StoreDefinition.
 */
function extractStoreAST(obj: ObjectLiteralExpression): StoreAST {
    const nameNode = getProperty(obj, 'name');
    const descNode = getProperty(obj, 'description');
    const initialStateNode = getProperty(obj, 'initialState');
    const actionsNode = getProperty(obj, 'actions');

    if (!nameNode || !initialStateNode || !actionsNode) {
        throw new Error('StoreDefinition is missing required properties: name, initialState, actions');
    }

    const name = getStringLiteralValue(nameNode.getInitializer()!);
    const description = descNode
        ? getStringLiteralValue(descNode.getInitializer()!)
        : undefined;

    const initialStateExpr = initialStateNode.getInitializer();
    const fields = initialStateExpr
        ? extractFields(initialStateExpr)
        : [];

    const actionsExpr = actionsNode.getInitializer();
    const actions = actionsExpr
        ? extractActions(actionsExpr)
        : [];

    return { name, description, fields, actions };
}

// ============================================================================
// Field extraction (initialState)
// ============================================================================

function extractFields(node: Node): FieldAST[] {
    if (!Node.isObjectLiteralExpression(node)) return [];

    return node
        .getProperties()
        .filter(Node.isPropertyAssignment)
        .map((prop) => extractField(prop as PropertyAssignment));
}

function extractField(prop: PropertyAssignment): FieldAST {
    const name = prop.getName();
    const initializer = prop.getInitializer();

    let typeAnnotation: string | null = null;
    let initialValue: unknown = undefined;

    if (initializer) {
        // Check for `<type>value` or `value as type` cast — extract the type text.
        if (Node.isAsExpression(initializer)) {
            typeAnnotation = initializer.getTypeNode()?.getText() ?? null;
            initialValue = nodeToValue(initializer.getExpression());
        } else if (Node.isTypeAssertion(initializer)) {
            typeAnnotation = initializer.getTypeNode().getText();
            initialValue = nodeToValue(initializer.getExpression());
        } else {
            initialValue = nodeToValue(initializer);
        }
    }

    return { name, typeAnnotation, initialValue };
}

// ============================================================================
// Action extraction
// ============================================================================

function extractActions(node: Node): ActionAST[] {
    if (!Node.isObjectLiteralExpression(node)) return [];

    return node
        .getProperties()
        .filter(Node.isPropertyAssignment)
        .map((prop) => extractAction(prop as PropertyAssignment));
}

function extractAction(prop: PropertyAssignment): ActionAST {
    const actionName = prop.getName();
    const initializer = prop.getInitializer();

    if (!initializer) {
        throw new Error(`Action "${actionName}" has no initializer`);
    }

    const arrowFn = Node.isArrowFunction(initializer) ? initializer : null;
    if (!arrowFn) {
        throw new Error(
            `Action "${actionName}" must be an arrow function, got ${initializer.getKindName()}`
        );
    }

    const params = arrowFn.getParameters();
    const stateParam = params[0];
    const payloadParam = params[1];

    if (!stateParam) {
        throw new Error(`Action "${actionName}" must have at least one parameter (state)`);
    }

    const stateParamName = stateParam.getName();

    let payloadParamName: string | null = null;
    let payloadType: string | null = null;

    if (payloadParam) {
        payloadParamName = payloadParam.getName();
        const typeNode = payloadParam.getTypeNode();
        payloadType = typeNode ? typeNode.getText() : null;
    }

    // Capture the body text exactly as written in source
    const body = arrowFn.getBody();
    const handlerBody = body.getText();

    return {
        name: actionName,
        payloadType,
        payloadParamName,
        stateParamName,
        handlerBody,
    };
}

// ============================================================================
// Utility: get a named PropertyAssignment from an ObjectLiteralExpression
// ============================================================================

function getProperty(
    obj: ObjectLiteralExpression,
    name: string
): PropertyAssignment | null {
    const prop = obj
        .getProperties()
        .find(
            (p): p is PropertyAssignment =>
                Node.isPropertyAssignment(p) && (p as PropertyAssignment).getName() === name
        );
    return prop ?? null;
}

function getStringLiteralValue(node: Node): string {
    if (Node.isStringLiteral(node)) {
        return node.getLiteralValue();
    }
    // Fallback: strip surrounding quotes from raw text
    const text = node.getText().trim();
    if ((text.startsWith("'") && text.endsWith("'")) ||
        (text.startsWith('"') && text.endsWith('"'))) {
        return text.slice(1, -1);
    }
    return text;
}

/**
 * Convert an AST node for an initial-state value into a plain JS value.
 * Only needs to handle JSON-representable values (no runtime expressions).
 */
function nodeToValue(node: Node): unknown {
    if (Node.isStringLiteral(node)) return node.getLiteralValue();
    if (Node.isNumericLiteral(node)) return Number(node.getLiteralValue());
    if (node.getKind() === SyntaxKind.TrueKeyword) return true;
    if (node.getKind() === SyntaxKind.FalseKeyword) return false;
    if (node.getKind() === SyntaxKind.NullKeyword) return null;
    if (Node.isArrayLiteralExpression(node)) {
        return node.getElements().map((el) => nodeToValue(el));
    }
    if (Node.isObjectLiteralExpression(node)) {
        const result: Record<string, unknown> = {};
        for (const prop of node.getProperties()) {
            if (Node.isPropertyAssignment(prop)) {
                result[prop.getName()] = nodeToValue(prop.getInitializer()!);
            }
        }
        return result;
    }
    if (Node.isAsExpression(node)) {
        return nodeToValue(node.getExpression());
    }
    if (Node.isTypeAssertion(node)) {
        return nodeToValue(node.getExpression());
    }
    // Prefix expressions like -1
    if (Node.isPrefixUnaryExpression(node)) {
        const operand = nodeToValue(node.getOperand());
        if (node.getOperatorToken() === SyntaxKind.MinusToken && typeof operand === 'number') {
            return -operand;
        }
    }
    return undefined;
}
