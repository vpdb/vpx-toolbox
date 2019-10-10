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

import { IRenderable } from '../../game/irenderable';
import { Matrix3D } from '../../math/matrix3d';
import { BufferGeometry, Group, Matrix4, MeshStandardMaterial, Object3D, PointLight, Vector2 } from '../../refs.node';
import { Pool } from '../../util/object-pool';
import { LightData } from '../../vpt/light/light-data';
import { LightState } from '../../vpt/light/light-state';
import { Material } from '../../vpt/material';
import { Mesh } from '../../vpt/mesh';
import { Table, TableGenerateOptions } from '../../vpt/table/table';
import { Texture } from '../../vpt/texture';
import { IRenderApi, MeshConvertOptions } from '../irender-api';
import { ThreeConverter } from './three-converter';
import { ThreeLightMeshGenerator } from './three-light-mesh-generator';
import { ThreeMapGenerator } from './three-map-generator';
import { ThreeMaterialGenerator } from './three-material-generator';
import { releaseGeometry, ThreeMeshGenerator } from './three-mesh-generator';
import { ThreePlayfieldMeshGenerator } from './three-playfield-mesh-generator';

export class ThreeRenderApi implements IRenderApi<Object3D, BufferGeometry, PointLight> {

	public static readonly SCALE = 0.05;
	public static readonly SHADOWS = true;

	public static POOL = {
		Matrix4: new Pool<Matrix4>(Matrix4),
		BufferGeometry: new Pool<BufferGeometry>(BufferGeometry),
	};

	private readonly converter: ThreeConverter;
	private readonly meshConvertOpts: MeshConvertOptions;
	private readonly playfieldGenerator: ThreePlayfieldMeshGenerator;
	private readonly lightGenerator: ThreeLightMeshGenerator;
	private readonly meshGenerator = new ThreeMeshGenerator();
	private readonly mapGenerator: ThreeMapGenerator;
	private readonly materialGenerator: ThreeMaterialGenerator;

	constructor(opts?: MeshConvertOptions) {
		this.meshConvertOpts = opts || {
			applyMaterials: false,
			optimizeTextures: false,
		};
		this.mapGenerator = new ThreeMapGenerator(this.meshConvertOpts.applyTextures);
		this.materialGenerator = new ThreeMaterialGenerator(this.mapGenerator);
		this.converter = new ThreeConverter(this.meshGenerator, this.mapGenerator, this.materialGenerator, this.meshConvertOpts);
		this.playfieldGenerator = new ThreePlayfieldMeshGenerator();
		this.lightGenerator = new ThreeLightMeshGenerator();
	}

	public async preloadTextures(textures: Texture[], table: Table): Promise<void> {
		await this.mapGenerator.loadTextures(textures, table);
	}

	public transformScene(scene: Group, table: Table): void {
		const dim = table.getDimensions();
		scene.rotateX(Math.PI / 2);
		scene.translateY(-dim.height * ThreeRenderApi.SCALE / 2);
		scene.translateX(-dim.width * ThreeRenderApi.SCALE / 2);
		scene.scale.set(ThreeRenderApi.SCALE, ThreeRenderApi.SCALE, ThreeRenderApi.SCALE);
	}

	public createParentNode(name: string): Group {
		const group = new Group();
		group.name = name;
		return group;
	}

	public createPointLight(lightData: LightData): PointLight {
		const light = new PointLight(lightData.color, lightData.intensity, lightData.falloff * ThreeRenderApi.SCALE, 2);
		light.name = `light:${lightData.getName()}`;
		light.updateMatrixWorld();
		light.position.set(lightData.center.x, lightData.center.y, -10);
		if (ThreeRenderApi.SHADOWS) {
			light.castShadow = true;
			light.shadow.bias = -0.001;
			light.shadow.radius = 12;
			light.shadow.mapSize = new Vector2(512, 512);
		}
		return light;
	}

	public addChildToParent(group: Group, obj: Object3D | Group): void {
		group.add(obj);
	}

	public findInGroup(group: Group, name: string): Object3D | undefined {
		return group.children.find(c => c.name === name);
	}

	public removeFromParent(group: Group, obj: Object3D | Group): void {
		/* istanbul ignore next */
		if (!obj) {
			return;
		}
		group.remove(obj);
	}

	public applyMatrixToNode(matrix: Matrix3D, obj: Object3D): void {
		/* istanbul ignore next */
		if (!obj) {
			return;
		}
		/* istanbul ignore if */
		if (!obj.matrix) {
			obj.matrix = new Matrix4();
		} else {
			obj.matrix.identity();
		}
		const m4 = ThreeRenderApi.POOL.Matrix4.get();
		m4.set(
			matrix._11, matrix._21, matrix._31, matrix._41,
			matrix._12, matrix._22, matrix._32, matrix._42,
			matrix._13, matrix._23, matrix._33, matrix._43,
			matrix._14, matrix._24, matrix._34, matrix._44,
		);
		obj.applyMatrix(m4);
		ThreeRenderApi.POOL.Matrix4.release(m4);
	}

	public applyVisibility(isVisible: boolean, obj: Object3D): void {
		/* istanbul ignore next */
		if (!obj) {
			return;
		}
		obj.visible = isVisible;
	}

	public applyMeshToNode(mesh: Mesh, obj: Object3D): void {
		/* istanbul ignore next */
		if (!obj) {
			return;
		}
		const destGeo = (obj as any).geometry;
		const srcGeo = this.meshGenerator.convertToBufferGeometry(mesh);

		if (srcGeo.attributes.position.array.length !== destGeo.attributes.position.array.length) {
			throw new Error(`Trying to apply geometry of ${srcGeo.attributes.position.array.length} positions to ${destGeo.attributes.position.array.length} positions.`);
		}
		for (let i = 0; i < destGeo.attributes.position.array.length; i++) {
			destGeo.attributes.position.array[i] = srcGeo.attributes.position.array[i];
		}
		destGeo.attributes.position.needsUpdate = true;
		releaseGeometry(srcGeo);
	}

	public applyLighting(state: LightState, light: PointLight | undefined): void {
		/* istanbul ignore next */
		if (!light) {
			return;
		}
		light.intensity = state.intensity;
	}

	public applyMaterial(obj: Object3D, material?: Material, map?: string, normalMap?: string, envMap?: string, emissiveMap?: string): void {
		/* istanbul ignore next */
		if (!obj) {
			return;
		}
		const threeMaterial: MeshStandardMaterial = (obj as any).material;
		this.materialGenerator.applyMaterial(threeMaterial, material);
		this.materialGenerator.applyMap(threeMaterial, map);
		this.materialGenerator.applyNormalMap(threeMaterial, normalMap);
		this.materialGenerator.applyEnvMap(threeMaterial, envMap);
		this.materialGenerator.applyEmissiveMap(threeMaterial, emissiveMap);
	}

	public async createObjectFromRenderable(renderable: IRenderable, table: Table, opts: TableGenerateOptions): Promise<Group> {
		return this.converter.createObject(renderable, table, this, opts);
	}

	public createLightGeometry(lightData: LightData, table: Table): BufferGeometry {
		return this.lightGenerator.createLight(lightData, table);
	}

	public createPlayfieldGeometry(table: Table, opts: TableGenerateOptions): BufferGeometry {
		return this.playfieldGenerator.createPlayfieldGeometry(table, opts);
	}

}
