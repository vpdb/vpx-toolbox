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

import { Matrix2D } from '../math/matrix2d';
import { Vertex2D } from '../math/vertex2d';
import { Vertex3D } from '../math/vertex3d';
import { Ball } from '../vpt/ball/ball';
import { CollisionEvent } from './collision-event';
import { CollisionType } from './collision-type';
import { FireEvents } from './fire-events';
import { HitLineZ } from './hit-line-z';
import { HitTestResult } from './hit-object';

export class HitLine3D extends HitLineZ<FireEvents> {

	private readonly matrix: Matrix2D = new Matrix2D();
	private readonly zLow: number = 0;
	private readonly zHigh: number = 0;

	constructor(v1: Vertex3D, v2: Vertex3D) {
		super(new Vertex2D()); // correct xy is set later below
		const vLine = v2.clone().sub(v1);
		vLine.normalize();

		// Axis of rotation to make 3D cylinder a cylinder along the z-axis
		const transAxis = new Vertex3D(vLine.y, -vLine.x, 0);
		const l = transAxis.lengthSq();
		if (l <= 1e-6) {     // line already points in z axis?
			transAxis.set(1, 0, 0);            // choose arbitrary rotation vector
		} else {
			transAxis.divideScalar(Math.sqrt(l));
		}

		// Angle to rotate the line into the z-axis
		const dot = vLine.z; //vLine.Dot(&vup);

		this.matrix.rotationAroundAxis(transAxis, -Math.sqrt(1 - dot * dot), dot);

		const vTrans1 = v1.clone().applyMatrix2D(this.matrix);
		const vTrans2z = v2.clone().applyMatrix2D(this.matrix).z;

		// set up HitLineZ parameters
		this.xy = new Vertex2D(vTrans1.x, vTrans1.y);
		this.zLow = Math.min(vTrans1.z, vTrans2z);
		this.zHigh = Math.max(vTrans1.z, vTrans2z);

		this.hitBBox.left = Math.min(v1.x, v2.x);
		this.hitBBox.right = Math.max(v1.x, v2.x);
		this.hitBBox.top = Math.min(v1.y, v2.y);
		this.hitBBox.bottom = Math.max(v1.y, v2.y);
		this.hitBBox.zlow = Math.min(v1.z, v2.z);
		this.hitBBox.zhigh = Math.max(v1.z, v2.z);
	}

	public calcHitBBox(): void {
		// already one in constructor
	}

	public hitTest(ball: Ball, dTime: number, coll: CollisionEvent): HitTestResult {
		if (!this.isEnabled) {
			return { hitTime: -1.0, coll };
		}
		// transform ball to cylinder coordinate system
		const oldPos = ball.state.pos.clone();
		const oldVel = ball.hit.vel.clone();
		ball.state.pos.applyMatrix2D(this.matrix);
		ball.state.pos.applyMatrix2D(this.matrix);

		// and update z bounds of LineZ with transformed coordinates
		const oldZ = new Vertex2D(this.hitBBox.zlow, this.hitBBox.zhigh);
		this.hitBBox.zlow = this.zLow;   // HACK; needed below // evil cast to non-const, should actually change the stupid HitLineZ to have explicit z coordinates!
		this.hitBBox.zhigh = this.zHigh; // dto.

		let hitTime: number;
		({ hitTime, coll } = super.hitTest(ball, dTime, coll));

		ball.state.pos.set(oldPos.x, oldPos.y, oldPos.z); // see above
		ball.hit.vel.set(oldVel.x, oldVel.y, oldVel.z);
		this.hitBBox.zlow = oldZ.x;   // HACK
		this.hitBBox.zhigh = oldZ.y;  // dto.

		if (hitTime >= 0) {      // transform hit normal back to world coordinate system
			coll.hitNormal = this.matrix.multiplyVectorT(coll.hitNormal!);
		}
		return { hitTime, coll };
	}

	public collide(coll: CollisionEvent): void {
		const ball = coll.ball;
		const hitNormal = coll.hitNormal!;

		const dot = -hitNormal.dot(ball.hit.vel);
		ball.hit.collide3DWall(hitNormal, this.elasticity, this.elasticityFalloff, this.friction, this.scatter);

		if (this.obj && this.fe && dot >= this.threshold) {
			if (this.objType === CollisionType.Primitive) {
				this.obj.currentHitThreshold = dot;
				this.fireHitEvent(ball);

			} else if (this.objType === CollisionType.HitTarget /*&& ((HitTarget*)m_obj)->m_d.m_isDropped == false*/) { // FIXME hittarget
				// FIXME hittarget
				//((HitTarget*)m_obj)->m_hitEvent = true;
				this.obj.currentHitThreshold = dot;
				this.fireHitEvent(ball);
			}
		}
	}
}