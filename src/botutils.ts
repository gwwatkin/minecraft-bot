import {pathfinder, Movements, goals} from 'mineflayer-pathfinder';
import { Item } from 'prismarine-item';
import { Vec3 } from 'vec3';
import { Block } from 'prismarine-block';
import { Entity } from 'prismarine-entity';
import * as mineflayer from "mineflayer";

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

export function isDiggableOffset(bot: mineflayer.Bot, center: Vec3, x_offset:number, y_offset:number, z_offset:number)
{
    return isDiggable(bot,center.offset(x_offset, y_offset, z_offset))
}

export function isDiggable(bot: mineflayer.Bot, target: Vec3)
{
    if(bot.blockAt(target) === null)
    {
        bot.chat("Null block at " + positionToString(target))
        return false;
    }

    if (!isSolidBlock(bot.blockAt(target)))
    {
        bot.chat("Found undiggable block at " + positionToString(target))
        // Need to make this async to do this, perhaps better to pass the goal instead
        //this.little_helper.bot.pathfinder.goto(make_goal_near(target, 2))
        return false;
    }
    return true;
}


// Assumes direction is unit vector in the xz plane
export namespace orientation{

    export enum Cardinal
    {
        North,
        West,
        South,
        East,
    }

    export function directionToCardinal(direction : Vec3) : Cardinal
    {
        if(direction.x == 1)  return Cardinal.East
        if(direction.z == 1)  return Cardinal.South
        if(direction.x == -1) return Cardinal.West
        if(direction.z == -1) return Cardinal.North
    }

    export function cardinalToDirection(cardinal : Cardinal) : Vec3
    {
        switch (cardinal)
        {
            case Cardinal.East :
                return new Vec3(1, 0, 0)
            case Cardinal.South:
                return new Vec3(0, 0, 1)
            case Cardinal.West :
                return new Vec3(-1, 0, 0)
            case Cardinal.North:
                return new Vec3(0, 0, -1)
        }
    }


    export function cardinalToRadians(cardinal : Cardinal) : number
    {
        switch (cardinal)
        {
            case Cardinal.East :
                return 0
            case Cardinal.South:
                return 3/2*Math.PI
            case Cardinal.West :
                return Math.PI
            case Cardinal.North:
                return 1/2*Math.PI
        }
    }


    export function right(direction : Vec3) : Vec3
    {
        if(direction.x == 1) return new Vec3(0,0,1)
        if(direction.z == 1) return new Vec3(-1,0,0)
        if(direction.x == -1) return new Vec3(0,0,-1)
        if(direction.z == -1) return new Vec3(1,0,0)
    }

    export function left(direction : Vec3)
    {
        return right(right(right(direction)))
    }
}