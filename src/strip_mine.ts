

import * as  botutils from './botutils'
import {LittleHelper} from './botmain'
import * as block_digger from './block_digger'




import {pathfinder, Movements, goals} from 'mineflayer-pathfinder';
import { Item } from 'prismarine-item';
import { Vec3 } from 'vec3';
import { Block } from 'prismarine-block';
import { Entity } from 'prismarine-entity';
import {digBlock} from "./block_digger";
import {ControlState} from "mineflayer";


export const NORTH_DIRECTION =
    botutils.orientation.cardinalToDirection(botutils.orientation.Cardinal.North)


export interface Tunnel
{
    //start_pos : Vec3
    direction : Vec3 // Must be unit vector
}


export class TunnelTask
{
    mine : Tunnel;
    little_helper : LittleHelper
    mined_distance  =0;

    constructor(mine : Tunnel, little_helper : LittleHelper)
    {
        this.mine = mine
        this.little_helper = little_helper
    }

    async run()
    {
        var first_block : Vec3 | null =  await this.walkUntillWall();
        if(first_block===null) return;

        for(var target = first_block;
            this.clearToTunnel(target);
            target = target.plus(this.mine.direction))
        {
            await block_digger.digBlock(this.little_helper.bot, target)
            await block_digger.digBlock(this.little_helper.bot, target.offset(0,1,0))

            if(this.little_helper.stop)
            {
                this.little_helper.stop = false;
                return
            }
        }

    }

    async walkUntillWall() : Promise<Vec3 | null>
    {
        // Look north straight forward and walk that way
        await this.little_helper.bot.look(0,0)
        this.little_helper.bot.setControlState("forward",true)

        // Busy wait till we hit a block
        for( var counter : number = 0;
             (await this.little_helper.bot.blockAtCursor(2)) === null && counter <10;
             counter++)
            await botutils.sleep(1000);

        // Stop walking
        await this.little_helper.bot.setControlState("forward",false)

        const block_at_cursor = await this.little_helper.bot.blockAtCursor(2)

        if(block_at_cursor === null)
        {
            this.little_helper.bot.chat("Could not find wall to start tunnel")
            return;
        }

        this.little_helper.bot.chat("Starting strip mine at "+botutils.positionToString(block_at_cursor.position))

        return block_at_cursor.position.offset(0,-1,0)

    }

    clearToTunnel(target : Vec3) : boolean
    {

        // Blocks to be mined
        const above_target  = target.offset(0,1,0)

        const boundary : Array<Vec3> = [

            target.plus(this.mine.direction),
            above_target.plus(this.mine.direction),

            target.plus(botutils.orientation.left(this.mine.direction)),
            above_target.plus(botutils.orientation.left(this.mine.direction)),
            target.plus(botutils.orientation.right(this.mine.direction)),
            above_target.plus(botutils.orientation.right(this.mine.direction)),

            target.offset(0,-1,0),
            above_target.offset(0,1,0)
        ]


        return boundary.filter(p => !botutils.isDiggable(this.little_helper.bot,p)).length == 0;
    }

}
