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

import { Expression } from 'estree';
import { Token } from 'moo';
import * as estree from './estree';

export function is(result: [Expression, null, Token, null, Expression]): Expression {
	const leftExpr = result[0];
	const rightExpr = result[4];
	return estree.binaryExpression('==', leftExpr, rightExpr);
}

export function isNot(result: [Expression, null, Token, null, Token, null, Expression]): Expression {
	const leftExpr = result[0];
	const rightExpr = result[6];
	return estree.binaryExpression('!=', leftExpr, rightExpr);
}

export function gte(result: [Expression, null, Token, null, Expression]): Expression {
	const leftExpr = result[0];
	const rightExpr = result[4];
	return estree.binaryExpression('>=', leftExpr, rightExpr);
}

export function lte(result: [Expression, null, Token, null, Expression]): Expression {
	const leftExpr = result[0];
	const rightExpr = result[4];
	return estree.binaryExpression('<=', leftExpr, rightExpr);
}

export function gt(result: [Expression, null, Token, null, Expression]): Expression {
	const leftExpr = result[0];
	const rightExpr = result[4];
	return estree.binaryExpression('>', leftExpr, rightExpr);
}

export function lt(result: [Expression, null, Token, null, Expression]): Expression {
	const leftExpr = result[0];
	const rightExpr = result[4];
	return estree.binaryExpression('<', leftExpr, rightExpr);
}

export function gtlt(result: [Expression, null, Token, null, Expression]): Expression {
	const leftExpr = result[0];
	const rightExpr = result[4];
	return estree.binaryExpression('!=', leftExpr, rightExpr);
}

export function eq(result: [Expression, null, Token, null, Expression]): Expression {
	const leftExpr = result[0];
	const rightExpr = result[4];
	return estree.binaryExpression('==', leftExpr, rightExpr);
}
