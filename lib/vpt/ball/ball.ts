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

import { Object3D } from 'three';
import { IHittable, IMovable } from '../item-data';
import { TableData } from '../table-data';
import { BallData } from './ball-data';
import { BallHit } from './ball-hit';
import { BallMesh } from './ball-mesh';
import { BallMover } from './ball-mover';
import { BallState } from './ball-state';

export class Ball implements IMovable<BallState>, IHittable {

	private readonly data: BallData;
	private readonly mesh: BallMesh;
	private readonly state: BallState;
	private readonly hit: BallHit;

	// unique ID for each ball
	private readonly id: number;

	private static idCounter = 0;

	constructor(data: BallData, state: BallState, tableData: TableData) {
		this.id = Ball.idCounter++;
		this.data = data;
		this.state = state;
		this.mesh = new BallMesh();
		this.hit = new BallHit(this, data, state, tableData);
	}

	public getName(): string {
		return `Ball${this.id}`;
	}

	public updateState(state: BallState, obj: Object3D): void {
		// TODO move ball
	}

	public getMover(): BallMover {
		return this.hit.getMoverObject();
	}

	public getHitObject(): BallHit {
		return this.hit;
	}
}
