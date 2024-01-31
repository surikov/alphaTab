"use strict";
exports.__esModule = true;
exports.isMap = exports.hasFlag = exports.isTypedArray = exports.wrapToNonNull = exports.isEnumType = exports.isNumberType = exports.isPrimitiveType = exports.unwrapArrayItemType = exports.getTypeWithNullableInfo = exports.createNodeFromSource = exports.setMethodBody = void 0;
var ts = require("typescript");
function setMethodBody(m, body) {
    return ts.factory.updateMethodDeclaration(m, m.modifiers, m.asteriskToken, m.name, m.questionToken, m.typeParameters, m.parameters, m.type, body);
}
exports.setMethodBody = setMethodBody;
function createNodeFromSource(source, kind) {
    var sourceFile = ts.createSourceFile('temp.ts', source.trim(), ts.ScriptTarget.Latest, 
    /*setParentNodes */ true, ts.ScriptKind.TS);
    var node = findNode(sourceFile, kind);
    if (!node) {
        throw new Error("Could not parse TS source to ".concat(ts.SyntaxKind[kind], ", node count was ").concat(sourceFile.getChildCount()));
    }
    return markNodeSynthesized(node);
}
exports.createNodeFromSource = createNodeFromSource;
function findNode(node, kind) {
    if (node.kind === kind) {
        return node;
    }
    for (var _i = 0, _a = node.getChildren(); _i < _a.length; _i++) {
        var c = _a[_i];
        var f = findNode(c, kind);
        if (f) {
            return f;
        }
    }
    return null;
}
function getTypeWithNullableInfo(checker, node, allowUnionAsPrimitive) {
    if (!node) {
        return {
            isNullable: false,
            isUnionType: false,
            type: {}
        };
    }
    var isNullable = false;
    var isUnionType = false;
    var type = null;
    if (ts.isUnionTypeNode(node)) {
        for (var _i = 0, _a = node.types; _i < _a.length; _i++) {
            var t = _a[_i];
            if (t.kind === ts.SyntaxKind.NullKeyword) {
                isNullable = true;
            }
            else if (ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword) {
                isNullable = true;
            }
            else if (type !== null) {
                if (allowUnionAsPrimitive) {
                    isUnionType = true;
                    type = checker.getTypeAtLocation(node);
                    break;
                }
                else {
                    throw new Error('Multi union types on JSON settings not supported: ' +
                        node.getSourceFile().fileName +
                        ':' +
                        node.getText());
                }
            }
            else {
                type = checker.getTypeAtLocation(t);
            }
        }
    }
    else {
        type = checker.getTypeAtLocation(node);
    }
    return {
        isNullable: isNullable,
        isUnionType: isUnionType,
        type: type
    };
}
exports.getTypeWithNullableInfo = getTypeWithNullableInfo;
function unwrapArrayItemType(type, typeChecker) {
    if (type.symbol && type.symbol.name === 'Array') {
        return type.typeArguments[0];
    }
    if (isPrimitiveType(type)) {
        return null;
    }
    if (type.isUnion()) {
        var nonNullable = typeChecker.getNonNullableType(type);
        if (type === nonNullable) {
            return null;
        }
        return unwrapArrayItemType(nonNullable, typeChecker);
    }
    return null;
}
exports.unwrapArrayItemType = unwrapArrayItemType;
function isPrimitiveType(type) {
    if (!type) {
        return false;
    }
    if (hasFlag(type, ts.TypeFlags.Number)) {
        return true;
    }
    if (hasFlag(type, ts.TypeFlags.String)) {
        return true;
    }
    if (hasFlag(type, ts.TypeFlags.Boolean)) {
        return true;
    }
    if (hasFlag(type, ts.TypeFlags.BigInt)) {
        return true;
    }
    if (hasFlag(type, ts.TypeFlags.Unknown)) {
        return true;
    }
    return isEnumType(type);
}
exports.isPrimitiveType = isPrimitiveType;
function isNumberType(type) {
    if (!type) {
        return false;
    }
    if (hasFlag(type, ts.TypeFlags.Number)) {
        return true;
    }
    return false;
}
exports.isNumberType = isNumberType;
function isEnumType(type) {
    // if for some reason this returns true...
    if (hasFlag(type, ts.TypeFlags.Enum))
        return true;
    // it's not an enum type if it's an enum literal type
    if (hasFlag(type, ts.TypeFlags.EnumLiteral) && !type.isUnion())
        return false;
    // get the symbol and check if its value declaration is an enum declaration
    var symbol = type.getSymbol();
    if (!symbol)
        return false;
    var valueDeclaration = symbol.valueDeclaration;
    return valueDeclaration && valueDeclaration.kind === ts.SyntaxKind.EnumDeclaration;
}
exports.isEnumType = isEnumType;
function wrapToNonNull(isNullableType, expr, factory) {
    return isNullableType ? expr : factory.createNonNullExpression(expr);
}
exports.wrapToNonNull = wrapToNonNull;
function isTypedArray(type) {
    var _a, _b;
    return !!((_b = (_a = type.symbol) === null || _a === void 0 ? void 0 : _a.members) === null || _b === void 0 ? void 0 : _b.has(ts.escapeLeadingUnderscores('slice')));
}
exports.isTypedArray = isTypedArray;
function hasFlag(type, flag) {
    return (type.flags & flag) === flag;
}
exports.hasFlag = hasFlag;
function isMap(type) {
    var _a;
    return !!(type && ((_a = type.symbol) === null || _a === void 0 ? void 0 : _a.name) === 'Map');
}
exports.isMap = isMap;
function markNodeSynthesized(node) {
    for (var _i = 0, _a = node.getChildren(); _i < _a.length; _i++) {
        var c = _a[_i];
        markNodeSynthesized(c);
    }
    ts.setTextRange(node, {
        pos: -1,
        end: -1
    });
    return node;
}
