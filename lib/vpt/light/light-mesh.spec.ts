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

import { expect } from 'chai';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { ThreeHelper } from '../../../test/three.helper';
import { NodeBinaryReader } from '../../io/binary-reader.node';
import { SpotLight } from '../../refs.node';
import { ThreeLightGenerator } from '../../render/threejs/three-light-generator';
import { Table } from '../table/table';
import { TableExporter } from '../table/table-exporter';

const three = new ThreeHelper();
const scale = 0.05;

describe('The VPinball lights generator', () => {

	let gltf: GLTF;

	before(async () => {
		const table = await Table.load(new NodeBinaryReader(three.fixturePath('table-light.vpx')));
		const exporter = new TableExporter(table);
		gltf = await three.loadGlb(await exporter.exportGlb({ exportPlayfieldLights: true }));
	});

	it('should generate a static light bulb mesh', async () => {
		three.expectObject(gltf, 'lightBulbs', 'StaticBulb', 'bulblight');
	});

	it('should generate a light bulb mesh', async () => {
		three.expectObject(gltf, 'lightBulbs', 'Bulb', 'bulblight');
	});

	it('should generate a scaled light bulb mesh', async () => {
		// TODO find a way to test scaling (vpx obj export doesn't export light bulbs)
		three.expectObject(gltf, 'lightBulbs', 'Scaled', 'bulblight');
	});

	it('should generate a light bulb mesh on a surface', async () => {
		// TODO find a way to test (vpx obj export doesn't export light bulbs)
		three.expectObject(gltf, 'lightBulbs', 'Surface', 'bulblight');
	});

	it('should not generate a light bulb with no bulb mesh', async () => {
		three.expectNoObject(gltf, 'lightBulbs', 'NoBulb');
	});

	it('should not generate a light with no bulb mesh', async () => {
		three.expectNoObject(gltf, 'lightBulbs', 'lightNoBulb');
	});

	it('should generate a light with default parameters', async () => {
		const light = three.find<SpotLight>(gltf, 'lightBulbs', 'StaticBulb', 'light');
		expect(light.decay).to.equal(2);
		expect(light.intensity).to.equal(ThreeLightGenerator.BULB_FACTOR);
		expect(light.distance).to.equal(scale * 50);
		expect(light.color.r).to.equal(1);
		expect(light.color.g).to.equal(1);
		expect(light.color.b).to.equal(0);
	});

	it('should generate a light with custom parameters', async () => {
		const light = three.find<SpotLight>(gltf, 'lightBulbs', 'CustomParams', 'light');
		expect(light.decay).to.equal(2);
		expect(light.intensity).to.be.closeTo(5.2 * ThreeLightGenerator.BULB_FACTOR, 0.0001);
		expect(light.distance).to.be.closeTo(scale * 64.1, 0.0001);
		expect(light.color.r).to.equal(0.34901960784313724);
		expect(light.color.g).to.equal(0.9333333333333333);
		expect(light.color.b).to.equal(0.06666666666666667);
	});

	it('should generate a mesh for a light with the same texture as the playfield', async () => {
		three.expectObject(gltf, 'playfieldLights', 'PlayfieldLight', 'surfacelight');
	});

	it('should generate a mesh for a light with the same texture as a surface', async () => {
		three.expectObject(gltf, 'playfieldLights', 'SurfaceLight', 'surfacelight');
	});

	it('should generate a mesh for a light that has the same texture as three other lights', async () => {
		three.expectObject(gltf, 'playfieldLights', 'SurfaceLightCollection', 'surfacelight');
	});

});
