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

import { HitObject } from '../physics/hit-object';
import { logger } from '../util/logger';
import { Ball } from '../vpt/ball/ball';
import { ItemApi } from '../vpt/item-api';
import { Event } from './event';
import { IPlayable } from './iplayable';
import { IScriptable } from './iscriptable';

export class EventProxy {

	/**
	 * while playing and the ball hits the mesh the hit threshold is updated here
	 */
	public currentHitThreshold: number = 0;

	private readonly playable: IPlayable;

	/**
	 * Logic executed on collision.
	 *
	 * This replaces the dreaded object casts in VP where the hit logic must
	 * be aware of the underlying object.
	 */
	public onCollision?: (obj: HitObject, ball: Ball, dot: number) => void;

	/**
	 * If implemented and false is returned, the hit test is skipped.
	 */
	public abortHitTest?: () => boolean;

	constructor(playable: IPlayable) {
		this.playable = playable;
	}

	public fireDispID(e: Event, ...params: any[]) {
		const scriptable = this.playable as IScriptable<ItemApi>;
		if (scriptable.getApi) {
			scriptable.getApi().emit(getEventName(e), params);
			logger().info('[%s] fireDispID(%s)', this.playable.getName(), e);
		}
	}

	public fireGroupEvent(e: Event): void {
		// todo send to collection
		this.fireDispID(e);
		//logger().info('[%s] fireGroupEvent(%s)', this.playable.getName(), e);
	}

	public fireVoidEvent(e: Event) {
		this.fireDispID(e);
	}

	public fireVoidEventParm(e: Event, ...params: any[]): void {
		this.fireDispID(e, params);
		//logger().info('[%s] fireGroupEvent(%s, %s)', this.playable.getName(), e, data);
	}
}

function getEventName(event: Event): string {
	switch (event) {
		case Event.HitEventsHit: return 'Hit';
		case Event.HitEventsUnhit: return 'Unhit';
		// case Event.TimerEventsTimer: return 'Timer';
		case Event.GameEventsInit: return 'Init';
		default: return 'UnknownEvent';
	}
}
