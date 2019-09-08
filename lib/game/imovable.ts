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

import { MoverObject } from '../physics/mover-object';
import { IRenderApi } from '../render/irender-api';
import { ItemState } from '../vpt/item-state';
import { Table } from '../vpt/table/table';
import { IPlayable } from './iplayable';
import { Player } from './player';

export interface IMovable<STATE extends ItemState> extends IPlayable {

	getMover(): MoverObject;

	getState(): STATE;

	applyState<NODE, GEOMETRY, POINT_LIGHT>(obj: NODE, renderApi: IRenderApi<NODE, GEOMETRY, POINT_LIGHT>, table: Table, player: Player, oldState: STATE): void;
}
