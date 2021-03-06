/*
 * VPDB - Virtual Pinball Database
 * Copyright (C) 2019 freezy <freezy@vpdb.io>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { replace } from 'estraverse';
import { CallExpression, Expression, Identifier, MemberExpression, Program } from 'estree';
import { EnumsApi } from '../../vpt/enums';
import { GlobalApi } from '../../vpt/global-api';
import { callExpression, identifier, literal, memberExpression } from '../estree';
import { Stdlib } from '../stdlib';
import { Transformer } from './transformer';

/**
 * This transformer handles two cases where VBScript's syntax is ambiguous
 * without context.
 *
 * 1. Call expressions that potentially are array accessors
 *
 *   In VBScript you can't tell if `someIdentifier(1)` is a function call with
 *   parameter `1` or access to the 2nd element of the `someIdentifier` array.
 *
 *   The {@link #transformCallExpressions()} method replaces ambiguous
 *   occurrences with a function call that determines this at runtime.
 *
 * 2. Property accessors that potentially are function calls
 *
 *   If a sub of an object has no parameters in VBScript, it's not clear at
 *   compile time if it's a sub or a property. For example, `foo.Bar` could be
 *   an access to `foo`'s `Bar` property or a call to its `Bar` sub.
 *
 *   The {@link #transformProperty()} method replaces ambiguous occurrences with
 *   a function call that determines this at runtime.
 */
export class AmbiguityTransformer extends Transformer {

	private readonly itemApis: { [p: string]: any };
	private readonly enumApis: EnumsApi;
	private readonly globalApi: GlobalApi;
	private readonly stdlib: Stdlib;

	constructor(ast: Program, itemApis: { [p: string]: any }, enumApis: EnumsApi, globalApi: GlobalApi, stdlib: Stdlib) {
		super(ast);
		this.itemApis = itemApis;
		this.enumApis = enumApis;
		this.globalApi = globalApi;
		this.stdlib = stdlib;
	}

	public transform(): Program {
		this.transformCallExpressions();
		this.transformProperty();
		return this.ast;
	}

	private transformCallExpressions(): Program {
		return replace(this.ast, {
			enter: (node, parent: any) => {
				if (node.type === 'CallExpression') {

					// EDIT: apparently, dictionaries are accessed by string.
					// if any of the parameters is a string, it's not an array index
					// for (const argument of node.arguments) {
					// 	if (argument.type === 'Literal' && typeof argument.value === 'string') {
					// 		return node;
					// 	}
					// }

					// we know what `eval()` is..
					if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
						return node;
					}

					// if it's an assignment where its left is the node, it's definitely not a function call
					if (parent && parent.type === 'AssignmentExpression' && node === parent.left) {
						let arrayNode: any = null;
						for (const argument of node.arguments) {
							arrayNode = memberExpression(
								arrayNode !== null ? arrayNode : node.callee,
								argument as Expression,
								true) as any;

							arrayNode.__isProperty = true; // so we don't transform it below
						}
						return arrayNode;
					}

					// if it's a member, then check if we exclude objects we know don't contain arrays
					if (node.callee.type === 'MemberExpression') {
						const topMemberName = this.getTopMemberName(node.callee);
						if ([ Transformer.ITEMS_NAME, Transformer.ENUMS_NAME,  Transformer.GLOBAL_NAME,
							Transformer.STDLIB_NAME, Transformer.VBSHELPER_NAME, Transformer.PLAYER_NAME ].includes(topMemberName)) {
							return node;
						}
					}

					// otherwise, we don't know, so use getOrCall
					(node.callee as any).__isProperty = true; // need to eval that on runtime, not compile time
					return getOrCall(node.callee as Expression, ...node.arguments as Expression[]);
				}
				return node;
			},
		}) as Program;
	}

	private transformProperty(): Program {
		return replace(this.ast, {
			enter: (node, parent: any) => {
				if (node.type === 'MemberExpression') {

					// if it's already a call, ignore
					if (parent && parent.type === 'CallExpression' && parent.callee === node) {
						return node;
					}

					// if it's an assignment where its left is the node, it's definitely not a function call
					if (parent && [ 'AssignmentExpression', 'ForOfStatement' ].includes(parent.type) && node === parent.left) {
						return node;
					}

					// if we previously determined that this isn't a function, return.
					if ((parent as any).__isProperty) {
						return node;
					}

					// if it's a variable declaration, ignore
					if (parent && parent.type === 'VariableDeclaration') {
						return node;
					}

					// if it's a class instantiation, ignore
					if (parent && parent.type === 'NewExpression') {
						return node;
					}

					// if it's within a redim call, ignore
					if (parent && parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression'
						&& parent.callee.object.type === 'Identifier' && parent.callee.object.name === Transformer.VBSHELPER_NAME
						&& parent.callee.property.type === 'Identifier' && parent.callee.property.name === 'redim') {
						return node;
					}

					// now, if it's a prop of something we already know, check if it's a function.
					const topMemberName = this.getTopMemberName(node);
					let api: any;
					switch (topMemberName) {
						case Transformer.GLOBAL_NAME:
							api = this.globalApi;
							break;
						case Transformer.ITEMS_NAME:
							api = this.itemApis;
							break;
						case Transformer.STDLIB_NAME:
							api = this.stdlib;
							break;
						case Transformer.ENUMS_NAME: // enums ain't no functions either
							return node;
					}

					const obj = getValue(api, node);
					// if it's a function, render it as such
					if (typeof obj === 'function' && (node as any).__isProperty !== true) {
						return callExpression(node, []);
					}
					// otherwise, if we got something, that means it's a property
					if (typeof obj !== 'undefined') {
						return node;
					}

					// already replaced?
					if (parent
						&& parent.type === 'CallExpression'
						&& parent.callee.type === 'MemberExpression'
						&& parent.callee.object.name === Transformer.VBSHELPER_NAME
						&& parent.callee.property.type === 'Identifier'
						&& (parent.callee.property.name === 'getOrCall' || parent.callee.property.name === 'getOrCallBound')) {
						return node;
					}

					// otherwise we don't know. so eval runtime
					return getOrCall(node);
				}
				return node;
			},
		}) as Program;
	}
}

/**
 * Reads the value from an object where an AST points to.
 * @param obj Object
 * @param ast AST
 * @param path Recursively populated path
 */
function getValue(obj: any, ast: MemberExpression, path: string[] = []): any {
	if (typeof obj === 'undefined') {
		return undefined;
	}
	if (ast.property.type !== 'Identifier') {
		return undefined;
	}
	if (ast.object.type === 'MemberExpression') {
		return getValue(obj, ast.object, [ ast.property.name, ...path ]);
	}
	if (ast.object.type === 'Identifier') {
		let o = obj;
		path = [ ast.property.name, ...path ];
		for (const name of path) {
			if (!o) {
				return undefined;
			}
			o = o[name];
		}
		return o;
	}
	return undefined;
}

/**
 * Creates a callExpression to the "getOrCall" vbs-helper.
 * @param callee Object
 * @param args Arguments
 */
function getOrCall(callee: Expression, ...args: Expression[]): CallExpression {
	if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
		return callExpression(
			memberExpression(
				identifier(Transformer.VBSHELPER_NAME),
				identifier('getOrCallBound'),
			),
			[ callee.object as Expression, literal(callee.property.name), ...args ],
		);
	} else {
		return callExpression(
			memberExpression(
				identifier(Transformer.VBSHELPER_NAME),
				identifier('getOrCall'),
			),
			[ callee, ...args ],
		);
	}
}
