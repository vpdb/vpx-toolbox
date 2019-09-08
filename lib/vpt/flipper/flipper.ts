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

import { EventProxy } from '../../game/event-proxy';
import { IHittable } from '../../game/ihittable';
import { IMovable } from '../../game/imovable';
import { IPlayable } from '../../game/iplayable';
import { IRenderable, Meshes } from '../../game/irenderable';
import { IScriptable } from '../../game/iscriptable';
import { Player } from '../../game/player';
import { Storage } from '../../io/ole-doc';
import { degToRad } from '../../math/float';
import { Matrix3D } from '../../math/matrix3d';
import { Vertex2D } from '../../math/vertex2d';
import { HitObject } from '../../physics/hit-object';
import { IRenderApi } from '../../render/irender-api';
import { Table } from '../table/table';
import { FlipperApi } from './flipper-api';
import { FlipperData } from './flipper-data';
import { FlipperHit } from './flipper-hit';
import { FlipperMesh } from './flipper-mesh';
import { FlipperMover } from './flipper-mover';
import { FlipperState } from './flipper-state';

/**
 * VPinball's flippers
 *
 * @see https://github.com/vpinball/vpinball/blob/master/flipper.cpp
 */
export class Flipper implements IRenderable, IPlayable, IMovable<FlipperState>, IHittable, IScriptable<FlipperApi> {

	private readonly data: FlipperData;
	private readonly mesh: FlipperMesh;
	private readonly state: FlipperState;
	private hit?: FlipperHit;
	private api!: FlipperApi;
	private events?: EventProxy;

	public static async fromStorage(storage: Storage, itemName: string): Promise<Flipper> {
		const data = await FlipperData.fromStorage(storage, itemName);
		return new Flipper(itemName, data);
	}

	public constructor(itemName: string, data: FlipperData) {
		this.data = data;
		this.mesh = new FlipperMesh();
		this.state = FlipperState.claim(this.getName(), this.data.startAngle);
	}

	public isVisible(): boolean {
		return this.data.isVisible;
	}

	public isCollidable(): boolean {
		return true;
	}

	public getMover(): FlipperMover {
		return this.hit!.getMoverObject();
	}

	public getState(): FlipperState {
		return this.state;
	}

	public setupPlayer(player: Player, table: Table): void {
		this.events = new EventProxy(this);
		this.hit = FlipperHit.getInstance(this.data, this.state, this.events, player.getPhysics(), table);
		this.api = new FlipperApi(this.data, this.state, this.hit, this.getMover(), this.events, player, table);
	}

	public getApi(): FlipperApi {
		return this.api!;
	}

	public getHitShapes(): HitObject[] {
		return [ this.hit! ];
	}

	public getName(): string {
		return this.data.wzName;
	}

	public getEventProxy(): EventProxy {
		return this.events!;
	}

	public getMeshes(table: Table): Meshes {
		const meshes: Meshes = {};

		const matrix = this.getMatrix().toRightHanded();
		const flipper = this.mesh.generateMeshes(this.data, table);

		// base mesh
		meshes.base = {
			mesh: flipper.base.transform(matrix),
			material: table.getMaterial(this.data.szMaterial),
			map: table.getTexture(this.data.szImage),
		};

		// rubber mesh
		if (flipper.rubber) {
			meshes.rubber = {
				mesh: flipper.rubber.transform(matrix),
				material: table.getMaterial(this.data.szRubberMaterial),
			};
		}
		return meshes;
	}

	public applyState<NODE, GEOMETRY, POINT_LIGHT>(obj: NODE, renderApi: IRenderApi<NODE, GEOMETRY, POINT_LIGHT>, table: Table, player: Player): void {
		const height = table.getSurfaceHeight(this.data.szSurface, this.data.center.x, this.data.center.y) * table.getScaleZ();

		const matToOrigin = Matrix3D.claim().setTranslation(-this.data.center.x, -this.data.center.y, -height);
		const matFromOrigin = Matrix3D.claim().setTranslation(this.data.center.x, this.data.center.y, height);
		const matRotate = Matrix3D.claim().rotateZMatrix(this.state.angle - degToRad(this.data.startAngle));
		const matrix = matToOrigin.multiply(matRotate).multiply(matFromOrigin);

		renderApi.applyMatrixToObject(matrix, obj);
		Matrix3D.release(matToOrigin, matFromOrigin, matRotate); // matrix and matToOrigin are the same instance
	}

	public getFlipperData(): FlipperData {
		return this.data;
	}

	private getMatrix(rotation: number = this.data.startAngle): Matrix3D {
		const trafoMatrix = new Matrix3D();
		const tempMatrix = Matrix3D.claim();
		trafoMatrix.setTranslation(this.data.center.x, this.data.center.y, 0);
		tempMatrix.rotateZMatrix(degToRad(rotation));
		trafoMatrix.preMultiply(tempMatrix);

		Matrix3D.release(tempMatrix);
		return trafoMatrix;
	}

	public getEventNames(): string[] {
		return [ 'Init', 'Timer', 'LimitEOS', 'LimitBOS', 'Hit', 'Collide' ];
	}
}

export interface FlipperConfig {
	center: Vertex2D;
	baseRadius: number;
	endRadius: number;
	flipperRadius: number;
	angleStart: number;
	angleEnd: number;
	zLow: number;
	zHigh: number;
}
