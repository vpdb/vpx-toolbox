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

import { IBinaryReader, OleCompoundDoc, Storage } from '../../io/ole-doc';
import { logger } from '../../util/logger';
import { Bumper } from '../bumper/bumper';
import { Flipper } from '../flipper/flipper';
import { Gate } from '../gate/gate';
import { HitTarget } from '../hit-target/hit-target';
import { ItemData } from '../item-data';
import { Kicker } from '../kicker/kicker';
import { Light } from '../light/light';
import { Plunger } from '../plunger/plunger';
import { Primitive } from '../primitive/primitive';
import { Ramp } from '../ramp/ramp';
import { Rubber } from '../rubber/rubber';
import { Spinner } from '../spinner/spinner';
import { Surface } from '../surface/surface';
import { TextBoxItem } from '../textbox-item';
import { Texture } from '../texture';
import { TimerItem } from '../timer-item';
import { Trigger } from '../trigger/trigger';
import { TableLoadOptions } from './table';
import { TableData } from './table-data';

export class TableLoader {

	private doc!: OleCompoundDoc;

	public async load(reader: IBinaryReader, opts: TableLoadOptions = {}): Promise<LoadedTable> {
		const then = Date.now();
		this.doc = await OleCompoundDoc.load(reader);
		try {

			const loadedTable: LoadedTable = {};
			if (opts.tableDataOnly || !opts.tableInfoOnly) {

				// open game storage
				const gameStorage = this.doc.storage('GameStg');

				// load table data
				loadedTable.data = await TableData.fromStorage(gameStorage, 'GameData');

				if (!opts.tableDataOnly) {

					// load items
					await this.loadGameItems(loadedTable, gameStorage, loadedTable.data.numGameItems, opts);

					// load images
					await this.loadTextures(loadedTable, gameStorage, loadedTable.data.numTextures);
				}
			}

			if (opts.tableInfoOnly || !opts.tableDataOnly) {
				await this.loadTableInfo(loadedTable);
			}

			logger().info('[Table.load] Table loaded in %sms.', Date.now() - then);

			return loadedTable;

		} finally {
			await this.doc.close();
		}
	}

	public async streamStorage<T>(name: string, streamer: (stg: Storage) => Promise<T>): Promise<T> {
		try {
			await this.doc.reopen();
			return await streamer(this.doc.storage(name));
		} finally {
			await this.doc.close();
		}
	}

	public async getTableScript(data: TableData): Promise<string> {
		await this.doc.reopen();
		try {
			const gameStorage = this.doc.storage('GameStg');
			const buffer = await gameStorage.read('GameData', data.scriptPos, data.scriptLen);
			return buffer.toString();
		} finally {
			await this.doc.close();
		}
	}

	private async loadGameItems(loadedTable: LoadedTable, storage: Storage, numItems: number, opts: TableLoadOptions): Promise<{[key: string]: number}> {
		const stats: {[key: string]: number} = {};

		// init arrays
		loadedTable.surfaces = [];
		loadedTable.primitives = [];
		loadedTable.lights = [];
		loadedTable.rubbers = [];
		loadedTable.flippers = [];
		loadedTable.bumpers = [];
		loadedTable.ramps = [];
		loadedTable.hitTargets = [];
		loadedTable.gates = [];
		loadedTable.kickers = [];
		loadedTable.triggers = [];
		loadedTable.spinners = [];
		loadedTable.timers = [];
		loadedTable.plungers = [];
		loadedTable.textBoxes = [];

		// go through all game items
		for (let i = 0; i < numItems; i++) {
			const itemName = `GameItem${i}`;
			const itemData = await storage.read(itemName, 0, 4);
			const itemType = itemData.readInt32LE(0);
			switch (itemType) {

				case ItemData.TypeSurface: {
					const item = await Surface.fromStorage(storage, itemName);
					loadedTable.surfaces.push(item);
					break;
				}

				case ItemData.TypePrimitive: {
					const item = await Primitive.fromStorage(storage, itemName);
					loadedTable.primitives.push(item);
					break;
				}

				case ItemData.TypeLight: {
					const item = await Light.fromStorage(storage, itemName);
					loadedTable.lights.push(item);
					break;
				}

				case ItemData.TypeRubber: {
					const item = await Rubber.fromStorage(storage, itemName);
					loadedTable.rubbers.push(item);
					break;
				}

				case ItemData.TypeFlipper: {
					const item = await Flipper.fromStorage(storage, itemName);
					loadedTable.flippers.push(item);
					break;
				}

				case ItemData.TypeBumper: {
					const item = await Bumper.fromStorage(storage, itemName);
					loadedTable.bumpers.push(item);
					break;
				}

				case ItemData.TypeRamp: {
					const item = await Ramp.fromStorage(storage, itemName);
					loadedTable.ramps.push(item);
					break;
				}

				case ItemData.TypeHitTarget: {
					loadedTable.hitTargets.push(await HitTarget.fromStorage(storage, itemName));
					break;
				}

				case ItemData.TypeGate: {
					loadedTable.gates.push(await Gate.fromStorage(storage, itemName));
					break;
				}

				case ItemData.TypeKicker: {
					loadedTable.kickers.push(await Kicker.fromStorage(storage, itemName));
					break;
				}

				case ItemData.TypeTrigger: {
					loadedTable.triggers.push(await Trigger.fromStorage(storage, itemName));
					break;
				}

				case ItemData.TypeSpinner: {
					loadedTable.spinners.push(await Spinner.fromStorage(storage, itemName));
					break;
				}

				case ItemData.TypeTimer: {
					if (opts.loadInvisibleItems) {
						loadedTable.timers.push(await TimerItem.fromStorage(storage, itemName));
					}
					break;
				}

				case ItemData.TypePlunger: {
					const item = await Plunger.fromStorage(storage, itemName);
					loadedTable.plungers.push(item);
					break;
				}

				case ItemData.TypeTextbox: {
					if (opts.loadInvisibleItems) {
						loadedTable.textBoxes.push(await TextBoxItem.fromStorage(storage, itemName));
					}
					break;
				}

				default:
					// ignore the rest for now
					break;
			}
			if (!stats[ItemData.getType(itemType)]) {
				stats[ItemData.getType(itemType)] = 1;
			} else {
				stats[ItemData.getType(itemType)]++;
			}
		}
		return stats;
	}

	private async loadTextures(loadedTable: LoadedTable, storage: Storage, numItems: number): Promise<void> {
		loadedTable.textures = [];
		for (let i = 0; i < numItems; i++) {
			const itemName = `Image${i}`;
			const texture = await Texture.fromStorage(storage, itemName);
			loadedTable.textures.push(texture);
		}
	}

	private async loadTableInfo(loadedTable: LoadedTable) {
		const tableInfoStorage = this.doc.storage('TableInfo');
		loadedTable.info = {};
		for (const key of tableInfoStorage.getStreams()) {
			const data = await tableInfoStorage.read(key);
			if (data) {
				loadedTable.info[key] = data.toString().replace(/\0/g, '');
			}
		}
	}
}

export interface LoadedTable {
	data?: TableData;
	info?: { [key: string]: string };

	textures?: Texture[];

	surfaces?: Surface[];
	primitives?: Primitive[];
	rubbers?: Rubber[];
	flippers?: Flipper[];
	bumpers?: Bumper[];
	ramps?: Ramp[];
	lights?: Light[];
	hitTargets?: HitTarget[];
	gates?: Gate[];
	kickers?: Kicker[];
	triggers?: Trigger[];
	spinners?: Spinner[];
	plungers?: Plunger[];
	textBoxes?: TextBoxItem[];

	timers?: TimerItem[];
}
