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

import { Table } from '../..';
import { bumperBaseMesh } from '../../../res/meshes/bumper-base-mesh';
import { bumperCapMesh } from '../../../res/meshes/bumper-cap-mesh';
import { bumperRingMesh } from '../../../res/meshes/bumper-ring-mesh';
import { bumperSocketMesh } from '../../../res/meshes/bumper-socket-mesh';
import { degToRad, f4 } from '../../math/float';
import { Matrix3D } from '../../math/matrix3d';
import { Vertex3D } from '../../math/vertex3d';
import { Mesh } from '../mesh';
import { BumperData } from './bumper-data';

export class BumperMeshGenerator {

	private readonly data: BumperData;

	private readonly scaledBashMesh: Mesh;
	private readonly scaledCapMesh: Mesh;
	private readonly scaledRingMesh: Mesh;
	private readonly scaledSocketMesh: Mesh;

	constructor(data: BumperData) {
		this.data = data;
		this.scaledBashMesh = bumperBaseMesh.clone().makeScale(this.data.radius, this.data.radius, this.data.heightScale);
		this.scaledCapMesh = bumperCapMesh.clone().makeScale(this.data.radius * 2, this.data.radius * 2, this.data.heightScale);
		this.scaledRingMesh = bumperRingMesh.clone().makeScale(this.data.radius, this.data.radius, this.data.heightScale);
		this.scaledSocketMesh = bumperSocketMesh.clone().makeScale(this.data.radius, this.data.radius, this.data.heightScale);
	}

	public getMeshes(table: Table): BumperMesh {
		/* istanbul ignore if */
		if (!this.data.vCenter) {
			throw new Error(`Cannot export bumper ${this.data.getName()} without vCenter.`);
		}
		const meshes: BumperMesh = {};
		const matrix = new Matrix3D().rotateZMatrix(degToRad(this.data.orientation));
		const height = table.getSurfaceHeight(this.data.szSurface, this.data.vCenter.x, this.data.vCenter.y) * table.getScaleZ();
		if (this.data.isBaseVisible) {
			meshes.base = this.generateMesh(
				`bumper-base-${this.data.getName()}`,
				this.scaledBashMesh,
				matrix,
				z => f4(z * table.getScaleZ()) + height,
			);
		}
		if (this.data.isRingVisible) {
			meshes.ring = this.generateRingMesh(table, height);
		}
		if (this.data.isSkirtVisible) {
			meshes.skirt = this.generateMesh(
				`bumper-socket-${this.data.getName()}`,
				this.scaledSocketMesh,
				matrix,
				z => f4(z * table.getScaleZ()) + (height + 5.0),
			);
		}
		if (this.data.isCapVisible) {
			meshes.cap = this.generateMesh(
				`bumper-cap-${this.data.getName()}`,
				this.scaledCapMesh,
				matrix,
				z => f4(f4(z + this.data.heightScale) * table.getScaleZ()) + height,
			);
		}
		return meshes;
	}

	public generateRingMesh(table: Table, offset: number): Mesh {
		const matrix = new Matrix3D().rotateZMatrix(degToRad(this.data.orientation));
		return this.generateMesh(
			`bumper-ring-${this.data.getName()}`,
			this.scaledRingMesh,
			matrix,
			z => f4(z * table.getScaleZ()) + offset,
		);
	}

	private generateMesh(name: string, mesh: Mesh, matrix: Matrix3D, zPos: (z: number) => number): Mesh {
		const generatedMesh = mesh.clone(name);
		for (const vertex of generatedMesh.vertices) {
			let vert = new Vertex3D(vertex.x, vertex.y, vertex.z);
			vert = matrix.multiplyVector(vert);
			vertex.x = vert.x + this.data.vCenter.x;
			vertex.y = vert.y + this.data.vCenter.y;
			vertex.z = zPos(vert.z);

			let normal = new Vertex3D(vertex.nx, vertex.ny, vertex.nz);
			normal = matrix.multiplyVectorNoTranslate(normal);
			vertex.nx = normal.x;
			vertex.ny = normal.y;
			vertex.nz = normal.z;
		}
		return generatedMesh;
	}
}

export interface BumperMesh {
	base?: Mesh;
	ring?: Mesh;
	skirt?: Mesh;
	cap?: Mesh;
}
