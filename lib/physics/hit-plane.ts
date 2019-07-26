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

import { Vertex3D } from '../math/vertex3d';
import { Ball } from '../vpt/ball/ball';
import { CollisionEvent } from './collision-event';
import { CollisionType } from './collision-type';
import { C_CONTACTVEL, PHYS_TOUCH } from './constants';
import { HitObject } from './hit-object';

export class HitPlane extends HitObject {

	private readonly normal: Vertex3D;
	private readonly d: number;

	constructor(normal: Vertex3D, d: number) {
		super();
		this.normal = normal;
		this.d = d;
	}

	public calcHitBBox(): void {
		// plane's not a box (i assume)
	}

	public collide(coll: CollisionEvent): void {
		coll.ball.getHitObject().collide3DWall(coll.hitNormal!, this.elasticity, this.elasticityFalloff, this.friction, this.scatter);

		// if ball has penetrated, push it out of the plane
		const bnd = this.normal.dot(coll.ball.state.pos) - coll.ball.data.radius - this.d; // distance from plane to ball surface
		if (bnd < 0) {
			coll.ball.state.pos.add(this.normal.clone().multiplyScalar(bnd));
		}
	}

	public hitTest(pball: Ball, dtime: number, coll: CollisionEvent): number {
		if (!this.isEnabled) {
			return -1.0;
		}

		const bnv = this.normal.dot(pball.state.vel);       // speed in normal direction

		if (bnv > C_CONTACTVEL) {                 // return if clearly ball is receding from object
			return -1.0;
		}

		const bnd = this.normal.dot(pball.state.pos) - pball.data.radius - this.d; // distance from plane to ball surface

		if (bnd < pball.data.radius * -2.0) { //!! solely responsible for ball through playfield?? check other places, too (radius*2??)
			return -1.0;   // excessive penetration of plane ... no collision HACK
		}

		let hittime: number;
		if (Math.abs(bnv) <= C_CONTACTVEL) {
			if (Math.abs(bnd) <= PHYS_TOUCH) {
				coll.isContact = true;
				coll.hitNormal = this.normal;
				coll.hitOrgNormalVelocity = bnv; // remember original normal velocity
				coll.hitDistance = bnd;
				//coll.m_hitRigid = true;
				return 0.0;    // hittime is ignored for contacts
			} else {
				return -1.0;   // large distance, small velocity -> no hit
			}
		}

		hittime = bnd / (-bnv);                   // rate ok for safe divide
		if (hittime < 0) {
			hittime = 0.0;     // already penetrating? then collide immediately
		}

		if (!isFinite(hittime) || hittime < 0 || hittime > dtime) {
			return -1.0;       // time is outside this frame ... no collision
		}

		coll.hitNormal = this.normal;
		coll.hitDistance = bnd;                // actual contact distance
		//coll.m_hitRigid = true;               // collision type

		return hittime;
	}

	public getType(): CollisionType {
		return CollisionType.Plane;
	}
}