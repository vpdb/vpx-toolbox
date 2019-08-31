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
import { Storage, Table } from '../..';
import { EventProxy } from '../../game/event-proxy';
import { IAnimatable } from '../../game/ianimatable';
import { IHittable } from '../../game/ihittable';
import { IRenderable } from '../../game/irenderable';
import { PlayerPhysics } from '../../game/player-physics';
import { Matrix3D } from '../../math/matrix3d';
import { HitObject } from '../../physics/hit-object';
import { Meshes } from '../item-data';
import { Texture } from '../texture';
import { BumperAnimation } from './bumper-animation';
import { BumperData } from './bumper-data';
import { BumperHit } from './bumper-hit';
import { BumperMeshGenerator } from './bumper-mesh-generator';
import { BumperMeshUpdater } from './bumper-mesh-updater';
import { BumperState } from './bumper-state';
import { Player } from '../../game/player';

/**
 * VPinball's bumper item.
 *
 * @see https://github.com/vpinball/vpinball/blob/master/bumper.cpp
 */
export class Bumper implements IRenderable, IHittable, IAnimatable<BumperState> {

	private readonly data: BumperData;
	private readonly meshGenerator: BumperMeshGenerator;
	private readonly meshUpdater: BumperMeshUpdater;
	private readonly state: BumperState;
	private hit?: BumperHit;
	private events?: EventProxy;
	private animation?: BumperAnimation;

	public static async fromStorage(storage: Storage, itemName: string): Promise<Bumper> {
		const data = await BumperData.fromStorage(storage, itemName);
		return new Bumper(data);
	}

	private constructor(data: BumperData) {
		this.data = data;
		this.state = new BumperState(this.getName(), 0, 0, 0);
		this.meshGenerator = new BumperMeshGenerator(data);
		this.meshUpdater = new BumperMeshUpdater(this.data, this.state, this.meshGenerator);
	}

	public getName() {
		return this.data.getName();
	}

	public getState(): BumperState {
		return this.state;
	}

	public isVisible(): boolean {
		return this.data.isBaseVisible || this.data.isRingVisible || this.data.isSkirtVisible || this.data.isCapVisible;
	}

	public isCollidable(): boolean {
		return this.data.isCollidable;
	}

	public setupPlayer(player: Player, table: Table): void {
		const height = table.getSurfaceHeight(this.data.szSurface, this.data.vCenter.x, this.data.vCenter.y);
		this.events = new EventProxy(this);
		this.animation = new BumperAnimation(this.data, this.state);
		this.hit = new BumperHit(this.data, this.state, this.animation, this.events, height);
	}

	public applyState(obj: Object3D, table: Table, player: Player, oldState: BumperState): void {
		this.meshUpdater.applyState(obj, table, player, oldState);
	}

	public getHitShapes(): HitObject[] {
		return [ this.hit! ];
	}

	public getAnimation(): BumperAnimation {
		return this.animation!;
	}

	public getMeshes(table: Table): Meshes {
		const meshes: Meshes = {};
		const bumper = this.meshGenerator.getMeshes(table);
		if (bumper.base) {
			meshes.base = {
				mesh: bumper.base.transform(new Matrix3D().toRightHanded()),
				material: table.getMaterial(this.data.szBaseMaterial),
				map: Texture.fromFilesystem('bumperbase.bmp'),
			};
		}
		if (bumper.ring) {
			meshes.ring = {
				mesh: bumper.ring.transform(new Matrix3D().toRightHanded()),
				material: table.getMaterial(this.data.szRingMaterial),
				map: Texture.fromFilesystem('bumperring.bmp'),
			};
		}
		if (bumper.skirt) {
			meshes.skirt = {
				mesh: bumper.skirt.transform(new Matrix3D().toRightHanded()),
				material: table.getMaterial(this.data.szSkirtMaterial),
				map: Texture.fromFilesystem('bumperskirt.bmp'),
			};
		}
		if (bumper.cap) {
			meshes.cap = {
				mesh: bumper.cap.transform(new Matrix3D().toRightHanded()),
				material: table.getMaterial(this.data.szCapMaterial),
				map: Texture.fromFilesystem('bumperCap.bmp'),
			};
		}
		return meshes;
	}
}
