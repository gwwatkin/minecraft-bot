const mineflayerViewer = require('prismarine-viewer').mineflayer

import * as  botutils from './botutils'
import {LittleHelper} from './botmain'
import * as block_digger from './block_digger'


import * as mineflayer from 'mineflayer'
import {pathfinder, Movements, goals} from 'mineflayer-pathfinder';
import { Item } from 'prismarine-item';
import { Vec3 } from 'vec3';
import { Block } from 'prismarine-block';
import { Entity } from 'prismarine-entity';



export interface Quarry
{
        start_pos : Vec3,
        radius : number,
        depth : number
}



export class QuarryTask
{

    quarry : Quarry;
    little_helper : LittleHelper;

    constructor(quarry : Quarry, little_helper : LittleHelper)
    {
        this.quarry = quarry
        this.little_helper = little_helper
    }

    async run()
    {
        const { x: start_x, y: start_y, z: start_z } = this.quarry.start_pos
        console.log("Starting quarry centered at "+start_x+", "+start_z);

        var last_harvest_time = performance.now()

        let level = -1 // Level indicates where we are from top layer of the quarry
        for(level = -1; level >= -this.quarry.depth; level--)
        {
            console.log("Quarry at level: "+level)

            const success = await this.dig_level(level)
            if(!success) return;

            if((performance.now()-last_harvest_time)/(60*1000) > 3) {
                await this.harvestLevel(level)
                last_harvest_time = performance.now()
            }

            await this.try_place_on_wall(level, 'ladder', new Vec3(1,0,0))

            if(level%5 === 0)
                await this.try_place_on_wall(level, 'torch', new Vec3(-1,0,0))


        } // done with digging

        await this.harvestLevel(-this.quarry.depth);
        this.little_helper.bot.chat("Finished quarry at "+
            botutils.positionToString(this.quarry.start_pos.offset(0,-this.quarry.depth,0)))
    }



    async try_place_on_wall(level : number, block_name : string, direction : Vec3)
    {
        const equipped = await this.little_helper.equipItem(block_name)
        if(!equipped)
        {
            this.little_helper.bot.chat("Missing "+block_name+" to place on quarry wall.")
            return
        }

        // Go to a wall
        const torch_target_pos = this.levelCenter(level).offset(
            (this.quarry.radius+1)*(-direction.x),
            0,
            (this.quarry.radius+1)*(-direction.z))

        await this.little_helper.bot.pathfinder.goto(botutils.make_goal_near(torch_target_pos))

        // Place
        await this.little_helper.bot.placeBlock(this.little_helper.bot.blockAt(torch_target_pos),direction)

        // Back to center
        await this.little_helper.bot.pathfinder.goto(botutils.make_goal_near(this.levelCenter(level),0))
    }

    levelCenter(level : number)
    {
        return this.quarry.start_pos.offset(0, level, 0);
    }

    async dig_level(level : number)
    {
        const l = this.levelOffsets(level)
        if(!this.check_boundaries(level))
            return false;

        for(const j in l)
        {
            const offset = l[j]
            await this.dig(this.quarry.start_pos.offset(offset.x,offset.y,offset.z))

            if(this.little_helper.stop)
            {
                this.little_helper.stop = false
                return false
            }
        }
        return true
    }



    async dig(target : Vec3)
    {
        // If block below is not diggable means there is something empty like a cave
        if(!botutils.isSolidBlock(
            this.little_helper.bot.blockAt(target.offset(0,-1,0))))
        {
            this.little_helper.bot.chat("Stopping Quarry: found undiggable under block "
                +botutils.positionToString(target))
            this.little_helper.stop = true;
            return;
        }

        await block_digger.digBlock(this.little_helper.bot, target)
    }


    async harvestLevel(level : number)
    {
        // Harvest the resources
        const l = this.levelOffsets(level)
        for (const j in l) {
            const offset = l[j]
            const target_block = this.little_helper.bot.blockAt(
                this.quarry.start_pos.offset(offset.x, offset.y, offset.z))
            await this.little_helper.bot.pathfinder.goto(botutils.make_goal_near(target_block.position))
        }

        // Back to the center
        await this.little_helper.bot.pathfinder.goto(
            botutils.make_goal_near(this.levelCenter(level),0))
    }


    check_boundaries(level : number)
    {
        const lvl_center = this.levelCenter(level)

        for(var i = -this.quarry.radius-1; i<=this.quarry.radius+1; i++)
        {
            if(!this.is_diggable(lvl_center, i, 0,-this.quarry.radius-1)) return false
            if(!this.is_diggable(lvl_center, i, 0,+this.quarry.radius+1)) return false
            if(!this.is_diggable(lvl_center, -this.quarry.radius-1, 0, i)) return false
            if(!this.is_diggable(lvl_center, +this.quarry.radius+1, 0, i)) return false
        }

        console.log("Boundaries clear")
        return true;
    }


    is_diggable(center : Vec3, x_offset, y_offset, z_offset)
    {
        return botutils.isDiggableOffset(this.little_helper.bot, center, x_offset, y_offset, z_offset);
    }


    levelOffsets(level : number)
    {
        var l = []
        for(var i = -this.quarry.radius; i<=this.quarry.radius; i++)
        {
            for(var j = -this.quarry.radius; j<=this.quarry.radius; j++)
            {
                l.push({x:i,y:level,z:j})
            }
        }
        return l
    }


}
