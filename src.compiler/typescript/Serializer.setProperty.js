"use strict";
exports.__esModule = true;
exports.createSetPropertyMethod = void 0;
var ts = require("typescript");
var BuilderHelpers_1 = require("../BuilderHelpers");
var BuilderHelpers_2 = require("../BuilderHelpers");
var BuilderHelpers_3 = require("../BuilderHelpers");
var BuilderHelpers_4 = require("../BuilderHelpers");
var BuilderHelpers_5 = require("../BuilderHelpers");
var BuilderHelpers_6 = require("../BuilderHelpers");
var BuilderHelpers_7 = require("../BuilderHelpers");
var BuilderHelpers_8 = require("../BuilderHelpers");
var BuilderHelpers_9 = require("../BuilderHelpers");
var Serializer_common_1 = require("./Serializer.common");
function isPrimitiveFromJson(type, typeChecker) {
    if (!type) {
        return false;
    }
    var isArray = (0, BuilderHelpers_5.isTypedArray)(type);
    var arrayItemType = (0, BuilderHelpers_6.unwrapArrayItemType)(type, typeChecker);
    if ((0, BuilderHelpers_3.hasFlag)(type, ts.TypeFlags.Unknown)) {
        return true;
    }
    if ((0, BuilderHelpers_3.hasFlag)(type, ts.TypeFlags.Number)) {
        return true;
    }
    if ((0, BuilderHelpers_3.hasFlag)(type, ts.TypeFlags.String)) {
        return true;
    }
    if ((0, BuilderHelpers_3.hasFlag)(type, ts.TypeFlags.Boolean)) {
        return true;
    }
    if (arrayItemType) {
        if (isArray && (0, BuilderHelpers_3.hasFlag)(arrayItemType, ts.TypeFlags.Number)) {
            return true;
        }
        if (isArray && (0, BuilderHelpers_3.hasFlag)(arrayItemType, ts.TypeFlags.String)) {
            return true;
        }
        if (isArray && (0, BuilderHelpers_3.hasFlag)(arrayItemType, ts.TypeFlags.Boolean)) {
            return true;
        }
    }
    else if (type.symbol) {
        switch (type.symbol.name) {
            case 'Uint8Array':
            case 'Uint16Array':
            case 'Uint32Array':
            case 'Int8Array':
            case 'Int16Array':
            case 'Int32Array':
            case 'Float32Array':
            case 'Float64Array':
                return true;
        }
    }
    return null;
}
function cloneTypeNode(node) {
    if (ts.isUnionTypeNode(node)) {
        return ts.factory.createUnionTypeNode(node.types.map(cloneTypeNode));
    }
    else if (node.kind === ts.SyntaxKind.StringKeyword ||
        node.kind === ts.SyntaxKind.NumberKeyword ||
        node.kind === ts.SyntaxKind.BooleanKeyword ||
        node.kind === ts.SyntaxKind.UnknownKeyword ||
        node.kind === ts.SyntaxKind.AnyKeyword ||
        node.kind === ts.SyntaxKind.VoidKeyword) {
        return ts.factory.createKeywordTypeNode(node.kind);
    }
    else if (ts.isLiteralTypeNode(node)) {
        return ts.factory.createLiteralTypeNode(node.literal);
    }
    else if (ts.isArrayTypeNode(node)) {
        return ts.factory.createArrayTypeNode(cloneTypeNode(node.elementType));
    }
    else if (ts.isTypeReferenceNode(node)) {
        return ts.factory.createTypeReferenceNode(cloneTypeNode(node.typeName));
    }
    else if (ts.isIdentifier(node)) {
        return ts.factory.createIdentifier(node.text);
    }
    else if (ts.isQualifiedName(node)) {
        if (typeof node.right === 'string') {
            return ts.factory.createQualifiedName(cloneTypeNode(node.left), node.right);
        }
        else {
            return ts.factory.createQualifiedName(cloneTypeNode(node.left), cloneTypeNode(node.right));
        }
    }
    throw new Error("Unsupported TypeNode: '".concat(ts.SyntaxKind[node.kind], "' extend type node cloning"));
}
function generateSetPropertyBody(program, serializable, importer) {
    var _a;
    var statements = [];
    var cases = [];
    var typeChecker = program.getTypeChecker();
    var _loop_1 = function (prop) {
        var jsonNames = prop.jsonNames.map(function (j) { return j.toLowerCase(); });
        var caseValues = jsonNames.filter(function (j) { return j !== ''; });
        var fieldName = prop.property.name.text;
        var caseStatements = [];
        var type = (0, BuilderHelpers_4.getTypeWithNullableInfo)(typeChecker, prop.property.type, true);
        var assignField = function (expr) {
            return ts.factory.createExpressionStatement(ts.factory.createAssignment(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('obj'), fieldName), expr));
        };
        if (type.isUnionType) {
            caseStatements.push(assignField(ts.factory.createAsExpression(type.isNullable
                ? ts.factory.createIdentifier('v')
                : ts.factory.createNonNullExpression(ts.factory.createIdentifier('v')), cloneTypeNode(prop.property.type))));
            caseStatements.push(ts.factory.createReturnStatement(ts.factory.createTrue()));
        }
        else if (isPrimitiveFromJson(type.type, typeChecker)) {
            caseStatements.push(assignField(ts.factory.createAsExpression(type.isNullable
                ? ts.factory.createIdentifier('v')
                : ts.factory.createNonNullExpression(ts.factory.createIdentifier('v')), cloneTypeNode(prop.property.type))));
            caseStatements.push(ts.factory.createReturnStatement(ts.factory.createTrue()));
        }
        else if ((0, BuilderHelpers_8.isEnumType)(type.type)) {
            importer(type.type.symbol.name, (0, Serializer_common_1.findModule)(type.type, program.getCompilerOptions()));
            importer('JsonHelper', '@src/io/JsonHelper');
            if (type.isNullable) {
                caseStatements.push((0, BuilderHelpers_1.createNodeFromSource)("obj.".concat(fieldName, " = JsonHelper.parseEnum<").concat(type.type.symbol.name, ">(v, ").concat(type.type.symbol.name, ");"), ts.SyntaxKind.ExpressionStatement));
            }
            else {
                caseStatements.push((0, BuilderHelpers_1.createNodeFromSource)("obj.".concat(fieldName, " = JsonHelper.parseEnum<").concat(type.type.symbol.name, ">(v, ").concat(type.type.symbol.name, ")!;"), ts.SyntaxKind.ExpressionStatement));
            }
            caseStatements.push(ts.factory.createReturnStatement(ts.factory.createTrue()));
        }
        else if ((0, BuilderHelpers_5.isTypedArray)(type.type)) {
            var arrayItemType = (0, BuilderHelpers_6.unwrapArrayItemType)(type.type, typeChecker);
            var collectionAddMethod = (_a = ts
                .getJSDocTags(prop.property)
                .filter(function (t) { return t.tagName.text === 'json_add'; })
                .map(function (t) { var _a; return (_a = t.comment) !== null && _a !== void 0 ? _a : ''; })[0]) !== null && _a !== void 0 ? _a : "".concat(fieldName, ".push");
            // obj.fieldName = [];
            // for(const i of value) {
            //    obj.addFieldName(Type.FromJson(i));
            // }
            // or
            // for(const __li of value) {
            //    obj.fieldName.push(Type.FromJson(__li));
            // }
            var itemSerializer = arrayItemType.symbol.name + 'Serializer';
            importer(itemSerializer, (0, Serializer_common_1.findSerializerModule)(arrayItemType, program.getCompilerOptions()));
            importer(arrayItemType.symbol.name, (0, Serializer_common_1.findModule)(arrayItemType, program.getCompilerOptions()));
            var loopItems = [
                (0, BuilderHelpers_1.createNodeFromSource)("obj.".concat(fieldName, " = [];"), ts.SyntaxKind.ExpressionStatement),
                (0, BuilderHelpers_1.createNodeFromSource)("for(const o of (v as (Map<string, unknown> | null)[])) {\n                        const i = new ".concat(arrayItemType.symbol.name, "();\n                        ").concat(itemSerializer, ".fromJson(i, o);\n                        obj.").concat(collectionAddMethod, "(i)\n                    }"), ts.SyntaxKind.ForOfStatement)
            ];
            if (type.isNullable) {
                caseStatements.push(ts.factory.createIfStatement(ts.factory.createIdentifier('v'), ts.factory.createBlock(loopItems, true)));
            }
            else {
                caseStatements.push.apply(caseStatements, loopItems);
            }
            caseStatements.push(ts.factory.createReturnStatement(ts.factory.createTrue()));
        }
        else if ((0, BuilderHelpers_7.isMap)(type.type)) {
            var mapType = type.type;
            if (!(0, BuilderHelpers_2.isPrimitiveType)(mapType.typeArguments[0])) {
                throw new Error('only Map<EnumType, *> maps are supported extend if needed!');
            }
            var mapKey = void 0;
            if ((0, BuilderHelpers_8.isEnumType)(mapType.typeArguments[0])) {
                importer(mapType.typeArguments[0].symbol.name, (0, Serializer_common_1.findModule)(mapType.typeArguments[0], program.getCompilerOptions()));
                importer('JsonHelper', '@src/io/JsonHelper');
                mapKey = (0, BuilderHelpers_1.createNodeFromSource)("JsonHelper.parseEnum<".concat(mapType.typeArguments[0].symbol.name, ">(k, ").concat(mapType.typeArguments[0].symbol.name, ")!"), ts.SyntaxKind.NonNullExpression);
            }
            else if ((0, BuilderHelpers_9.isNumberType)(mapType.typeArguments[0])) {
                mapKey = (0, BuilderHelpers_1.createNodeFromSource)("parseInt(k)", ts.SyntaxKind.CallExpression);
            }
            else {
                mapKey = ts.factory.createIdentifier('k');
            }
            var mapValue = void 0;
            var itemSerializer = '';
            if (isPrimitiveFromJson(mapType.typeArguments[1], typeChecker)) {
                mapValue = ts.factory.createAsExpression(ts.factory.createIdentifier('v'), ts.isTypeReferenceNode(prop.property.type) && prop.property.type.typeArguments
                    ? cloneTypeNode(prop.property.type.typeArguments[1])
                    : ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
            }
            else {
                itemSerializer = mapType.typeArguments[1].symbol.name + 'Serializer';
                importer(itemSerializer, (0, Serializer_common_1.findSerializerModule)(mapType.typeArguments[1], program.getCompilerOptions()));
                importer(mapType.typeArguments[1].symbol.name, (0, Serializer_common_1.findModule)(mapType.typeArguments[1], program.getCompilerOptions()));
                mapValue = ts.factory.createIdentifier('i');
            }
            var collectionAddMethod = ts
                .getJSDocTags(prop.property)
                .filter(function (t) { return t.tagName.text === 'json_add'; })
                .map(function (t) { var _a; return (_a = t.comment) !== null && _a !== void 0 ? _a : ''; })[0] || fieldName + '.set';
            caseStatements.push(assignField(ts.factory.createNewExpression(ts.factory.createIdentifier('Map'), [
                typeChecker.typeToTypeNode(mapType.typeArguments[0], undefined, undefined),
                typeChecker.typeToTypeNode(mapType.typeArguments[1], undefined, undefined)
            ], [])));
            caseStatements.push(ts.factory.createExpressionStatement(ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('JsonHelper'), 'forEach'), undefined, [
                ts.factory.createIdentifier('v'),
                ts.factory.createArrowFunction(undefined, undefined, [
                    ts.factory.createParameterDeclaration(undefined, undefined, 'v'),
                    ts.factory.createParameterDeclaration(undefined, undefined, 'k')
                ], undefined, ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), ts.factory.createBlock([
                    itemSerializer.length > 0 &&
                        (0, BuilderHelpers_1.createNodeFromSource)("const i = new ".concat(mapType.typeArguments[1].symbol.name, "();"), ts.SyntaxKind.VariableStatement),
                    itemSerializer.length > 0 &&
                        (0, BuilderHelpers_1.createNodeFromSource)("".concat(itemSerializer, ".fromJson(i, v as Map<string, unknown>)"), ts.SyntaxKind.ExpressionStatement),
                    ts.factory.createExpressionStatement(ts.factory.createCallExpression(collectionAddMethod
                        ? ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('obj'), collectionAddMethod)
                        : ts.factory.createPropertyAccessExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('obj'), ts.factory.createIdentifier(fieldName)), ts.factory.createIdentifier('set')), undefined, [mapKey, mapValue]))
                ].filter(function (s) { return !!s; }), true))
            ])));
            caseStatements.push(ts.factory.createReturnStatement(ts.factory.createTrue()));
        }
        else if ((0, Serializer_common_1.isImmutable)(type.type)) {
            var itemSerializer = type.type.symbol.name;
            importer(itemSerializer, (0, Serializer_common_1.findModule)(type.type, program.getCompilerOptions()));
            // obj.fieldName = TypeName.fromJson(value)!
            // return true;
            caseStatements.push((0, BuilderHelpers_1.createNodeFromSource)("obj.".concat(fieldName, " = ").concat(itemSerializer, ".fromJson(v)!;"), ts.SyntaxKind.ExpressionStatement));
            caseStatements.push((0, BuilderHelpers_1.createNodeFromSource)("return true;", ts.SyntaxKind.ReturnStatement));
        }
        else {
            // for complex types it is a bit more tricky
            // if the property matches exactly, we use fromJson
            // if the property starts with the field name, we try to set a sub-property
            var jsonNameArray = ts.factory.createArrayLiteralExpression(jsonNames.map(function (n) { return ts.factory.createStringLiteral(n); }));
            var itemSerializer = type.type.symbol.name + 'Serializer';
            importer(itemSerializer, (0, Serializer_common_1.findSerializerModule)(type.type, program.getCompilerOptions()));
            if (type.isNullable) {
                importer(type.type.symbol.name, (0, Serializer_common_1.findModule)(type.type, program.getCompilerOptions()));
            }
            // TODO if no partial name support, simply generate cases
            statements.push(ts.factory.createIfStatement(
            // if(["", "core"].indexOf(property) >= 0)
            ts.factory.createBinaryExpression(ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(jsonNameArray, 'indexOf'), [], [ts.factory.createIdentifier('property')]), ts.SyntaxKind.GreaterThanEqualsToken, ts.factory.createNumericLiteral('0')), ts.factory.createBlock(!type.isNullable
                ? [
                    ts.factory.createExpressionStatement(ts.factory.createCallExpression(
                    // TypeName.fromJson
                    ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(itemSerializer), 'fromJson'), [], [
                        ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('obj'), fieldName),
                        ts.factory.createAsExpression(ts.factory.createIdentifier('v'), (0, Serializer_common_1.createStringUnknownMapNode)())
                    ])),
                    ts.factory.createReturnStatement(ts.factory.createTrue())
                ]
                : [
                    ts.factory.createIfStatement(ts.factory.createIdentifier('v'), ts.factory.createBlock([
                        assignField(ts.factory.createNewExpression(ts.factory.createIdentifier(type.type.symbol.name), undefined, [])),
                        ts.factory.createExpressionStatement(ts.factory.createCallExpression(
                        // TypeName.fromJson
                        ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(itemSerializer), 'fromJson'), [], [
                            ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('obj'), fieldName),
                            ts.factory.createAsExpression(ts.factory.createIdentifier('v'), (0, Serializer_common_1.createStringUnknownMapNode)())
                        ]))
                    ], true), ts.factory.createBlock([assignField(ts.factory.createNull())], true)),
                    ts.factory.createReturnStatement(ts.factory.createTrue())
                ], true), !prop.partialNames
                ? undefined
                : ts.factory.createBlock([
                    // for(const candidate of ["", "core"]) {
                    //   if(candidate.indexOf(property) === 0) {
                    //     if(!this.field) { this.field = new FieldType(); }
                    //     if(this.field.setProperty(property.substring(candidate.length), value)) return true;
                    //   }
                    // }
                    ts.factory.createForOfStatement(undefined, ts.factory.createVariableDeclarationList([ts.factory.createVariableDeclaration('c')], ts.NodeFlags.Const), jsonNameArray, ts.factory.createBlock([
                        ts.factory.createIfStatement(ts.factory.createBinaryExpression(ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('property'), 'indexOf'), [], [ts.factory.createIdentifier('c')]), ts.SyntaxKind.EqualsEqualsEqualsToken, ts.factory.createNumericLiteral('0')), ts.factory.createBlock([
                            type.isNullable &&
                                ts.factory.createIfStatement(ts.factory.createPrefixUnaryExpression(ts.SyntaxKind.ExclamationToken, ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('obj'), fieldName)), ts.factory.createBlock([
                                    assignField(ts.factory.createNewExpression(ts.factory.createIdentifier(type.type.symbol.name), [], []))
                                ])),
                            ts.factory.createIfStatement(ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(itemSerializer), 'setProperty'), [], [
                                ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('obj'), fieldName),
                                ts.factory.createCallExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('property'), 'substring'), [], [
                                    ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('c'), 'length')
                                ]),
                                ts.factory.createIdentifier('v')
                            ]), ts.factory.createBlock([
                                ts.factory.createReturnStatement(ts.factory.createTrue())
                            ], true))
                        ].filter(function (s) { return !!s; }), true))
                    ], true))
                ], true)));
        }
        if (caseStatements.length > 0) {
            for (var i = 0; i < caseValues.length; i++) {
                var caseClause = ts.factory.createCaseClause(ts.factory.createStringLiteral(caseValues[i]), 
                // last case gets the statements, others are fall through
                i < caseValues.length - 1 ? [] : caseStatements);
                if (prop.target && i === 0) {
                    caseClause = ts.addSyntheticLeadingComment(caseClause, ts.SyntaxKind.MultiLineCommentTrivia, "@target ".concat(prop.target), true);
                }
                cases.push(caseClause);
            }
        }
    };
    for (var _i = 0, _b = serializable.properties; _i < _b.length; _i++) {
        var prop = _b[_i];
        _loop_1(prop);
    }
    if (cases.length > 0) {
        var switchExpr = ts.factory.createSwitchStatement(ts.factory.createIdentifier('property'), ts.factory.createCaseBlock(cases));
        statements.unshift(switchExpr);
    }
    if (serializable.hasSetPropertyExtension) {
        statements.push(ts.factory.createReturnStatement((0, BuilderHelpers_1.createNodeFromSource)("obj.setProperty(property, v);", ts.SyntaxKind.CallExpression)));
    }
    else {
        statements.push(ts.factory.createReturnStatement(ts.factory.createFalse()));
    }
    return ts.factory.createBlock(statements, true);
}
function createSetPropertyMethod(program, input, serializable, importer) {
    var methodDecl = (0, BuilderHelpers_1.createNodeFromSource)("public class Serializer {\n            public static setProperty(obj: ".concat(input.name.text, ", property: string, v: unknown): boolean {\n            }\n        }"), ts.SyntaxKind.MethodDeclaration);
    return (0, BuilderHelpers_1.setMethodBody)(methodDecl, generateSetPropertyBody(program, serializable, importer));
}
exports.createSetPropertyMethod = createSetPropertyMethod;
