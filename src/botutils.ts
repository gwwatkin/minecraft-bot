import {pathfinder, Movements, goals} from 'mineflayer-pathfinder';
import { Item } from 'prismarine-item';
import { Vec3 } from 'vec3';
import { Block } from 'prismarine-block';
import { Entity } from 'prismarine-entity';

const RANGE_GOAL : number =1





export function make_goal_near(position : Vec3, range : number=RANGE_GOAL)
{
    return new goals.GoalNear(position.x, position.y, position.z, range)
}

export function itemToString (item : Item) {
    if (item) {
        return `${item.name} x ${item.count}`
    } else {
        return '(nothing)'
    }
}

export function isSolidBlock(block : Block)
{
    return block.boundingBox !== 'empty' && block.diggable;
}

export function onDiggingCompleted (err : Error) : null
{
    if (err) {
        console.log(err.stack)
        return
    }
}

export async function sleep(t : number)
{
    return new Promise(r => setTimeout(r, t))
}


export function positionToString(pos : Vec3)
{
    return ""+pos.x+", "+pos.y+", "+pos.z
}
