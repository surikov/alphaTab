"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
/**
 * This file contains an emitter which generates classes to clone
 * any data models following certain rules.
 */
var path = require("path");
var ts = require("typescript");
var EmitterBase_1 = require("./EmitterBase");
var BuilderHelpers_1 = require("../BuilderHelpers");
function removeExtension(fileName) {
    return fileName.substring(0, fileName.lastIndexOf('.'));
}
function toImportPath(fileName) {
    return '@' + removeExtension(fileName).split('\\').join('/');
}
function isClonable(type) {
    if (!type.symbol) {
        return false;
    }
    var declaration = type.symbol.valueDeclaration;
    if (declaration) {
        return !!ts.getJSDocTags(declaration).find(function (t) { return t.tagName.text === 'cloneable'; });
    }
    return false;
}
function isCloneMember(propertyDeclaration) {
    if (propertyDeclaration.modifiers) {
        if (propertyDeclaration.modifiers.find(function (m) { return m.kind === ts.SyntaxKind.StaticKeyword || m.kind === ts.SyntaxKind.ReadonlyKeyword; })) {
            return false;
        }
        if (!propertyDeclaration.modifiers.find(function (m) { return m.kind === ts.SyntaxKind.PublicKeyword; })) {
            return false;
        }
    }
    if (ts.getJSDocTags(propertyDeclaration).find(function (t) { return t.tagName.text === 'clone_ignore'; })) {
        return false;
    }
    return true;
}
function generateClonePropertyStatements(prop, typeChecker, importer) {
    var propertyType = (0, BuilderHelpers_1.getTypeWithNullableInfo)(typeChecker, prop.type, true);
    var statements = [];
    var propertyName = prop.name.text;
    function assign(expr) {
        return [
            ts.factory.createExpressionStatement(ts.factory.createAssignment(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('clone'), propertyName), expr))
        ];
    }
    var arrayItemType = (0, BuilderHelpers_1.unwrapArrayItemType)(propertyType.type, typeChecker);
    if (arrayItemType) {
        if (isClonable(arrayItemType)) {
            var collectionAddMethod = ts
                .getJSDocTags(prop)
                .filter(function (t) { return t.tagName.text === 'clone_add'; })
                .map(function (t) { var _a; return (_a = t.comment) !== null && _a !== void 0 ? _a : ''; })[0];
            importer(arrayItemType.symbol.name + 'Cloner', './' + arrayItemType.symbol.name + 'Cloner');
            var loopItems = __spreadArray(__spreadArray([], assign(ts.factory.createArrayLiteralExpression(undefined)), true), [
                ts.factory.createForOfStatement(undefined, ts.factory.createVariableDeclarationList([ts.factory.createVariableDeclaration('i')], ts.NodeFlags.Const), ts.factory.createNonNullExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('original'), propertyName)), ts.factory.createBlock([
                    ts.factory.createExpressionStatement(collectionAddMethod
                        ? // clone.addProp(ItemTypeCloner.clone(i))
                            ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('clone'), collectionAddMethod), undefined, [
                                ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(arrayItemType.symbol.name + 'Cloner'), 'clone'), undefined, [ts.factory.createIdentifier('i')])
                            ])
                        : // clone.prop.push(ItemTypeCloner.clone(i))
                            ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('clone'), propertyName), 'push'), undefined, [
                                ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(arrayItemType.symbol.name + 'Cloner'), 'clone'), undefined, [ts.factory.createIdentifier('i')])
                            ]))
                ], true))
            ], false);
            if (propertyType.isNullable) {
                // if(original.prop) {
                //   clone.prop = [];
                //   for(const i of original.prop) { clone.addProp(ItemTypeCloner.clone(i)); }
                //   // or
                //   for(const i of original.prop) { clone.prop.add(ItemTypeCloner.clone(i)); }
                // }
                statements.push(ts.factory.createIfStatement(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('original'), propertyName), ts.factory.createBlock(loopItems, true), undefined));
            }
            else {
                // clone.prop = [];
                // for(const i of original.prop) { clone.addProp(ItemTypeCloner.clone(i)); }
                // // or
                // for(const i of original.prop) { clone.prop.add(ItemTypeCloner.clone(i)); }
                statements.push.apply(statements, loopItems);
            }
        }
        else {
            var sliceCall = ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('original'), propertyName), 'slice'), undefined, []);
            if (propertyType.isNullable) {
                statements.push.apply(statements, assign(ts.factory.createConditionalExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('original'), propertyName), ts.factory.createToken(ts.SyntaxKind.QuestionToken), sliceCall, ts.factory.createToken(ts.SyntaxKind.ColonToken), ts.factory.createNull())));
            }
            else {
                // clone.prop = original.prop.splice()
                statements.push.apply(statements, assign(sliceCall));
            }
        }
    }
    else {
        if (isClonable(propertyType.type)) {
            importer(propertyType.type.symbol.name + 'Cloner', './' + propertyType.type.symbol.name + 'Cloner');
            // clone.prop = original.prop ? TypeNameCloner.clone(original.prop) : null
            statements.push.apply(statements, assign(ts.factory.createConditionalExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('original'), propertyName), ts.factory.createToken(ts.SyntaxKind.QuestionToken), ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(propertyType.type.symbol.name + 'Cloner'), 'clone'), undefined, [
                ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('original'), propertyName)
            ]), ts.factory.createToken(ts.SyntaxKind.ColonToken), ts.factory.createNull())));
        }
        else {
            // clone.prop = original.prop
            statements.push.apply(statements, assign(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('original'), propertyName)));
        }
    }
    return statements;
}
function generateCloneBody(program, input, importer) {
    var typeChecker = program.getTypeChecker();
    var propertiesToSerialize = input.members
        .filter(function (m) { return ts.isPropertyDeclaration(m) && isCloneMember(m); })
        .map(function (m) { return m; });
    var bodyStatements = propertiesToSerialize.reduce(function (stmts, prop) {
        stmts.push.apply(stmts, generateClonePropertyStatements(prop, typeChecker, importer));
        return stmts;
    }, new Array());
    return ts.factory.createBlock(__spreadArray(__spreadArray([
        // const clone = new Type();
        ts.factory.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
            ts.factory.createVariableDeclaration('clone', undefined, undefined, ts.factory.createNewExpression(ts.factory.createIdentifier(input.name.text), undefined, []))
        ], ts.NodeFlags.Const))
    ], bodyStatements, true), [
        // return json;
        ts.factory.createReturnStatement(ts.factory.createIdentifier('clone'))
    ], false), true);
}
function createCloneMethod(program, input, importer) {
    return ts.factory.createMethodDeclaration([
        ts.factory.createModifier(ts.SyntaxKind.PublicKeyword),
        ts.factory.createModifier(ts.SyntaxKind.StaticKeyword)
    ], undefined, 'clone', undefined, undefined, [
        ts.factory.createParameterDeclaration(undefined, undefined, 'original', undefined, ts.factory.createTypeReferenceNode(input.name.text, undefined), undefined)
    ], ts.factory.createTypeReferenceNode(input.name.text, undefined), generateCloneBody(program, input, importer));
}
exports["default"] = (0, EmitterBase_1["default"])('cloneable', function (program, input) {
    console.log("Writing Cloner for ".concat(input.name.text));
    var sourceFileName = path.relative(path.join(path.resolve(program.getCompilerOptions().baseUrl)), path.resolve(input.getSourceFile().fileName));
    var statements = [];
    function importer(name, module) {
        statements.push(ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([
            ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(name))
        ])), ts.factory.createStringLiteral(module)));
    }
    statements.push(ts.factory.createClassDeclaration([ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], input.name.text + 'Cloner', undefined, undefined, [createCloneMethod(program, input, importer)]));
    var sourceFile = ts.factory.createSourceFile(__spreadArray([
        ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([
            ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(input.name.text))
        ])), ts.factory.createStringLiteral(toImportPath(sourceFileName)))
    ], statements, true), ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
    return sourceFile;
});
