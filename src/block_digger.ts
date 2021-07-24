import {Block} from "prismarine-block";
import * as botutils from "./botutils";
import {goals} from "mineflayer-pathfinder";
import {Bot} from "mineflayer";
import {Vec3} from "vec3"



export async function digBlock(bot:Bot, target : Vec3) : Promise<boolean>
{

    const target_block = bot.blockAt(target)
    // Try getting closer if can't dig the block
    if(!bot.canDigBlock(target_block))
    {
        await bot.pathfinder.goto(new goals.GoalNear(
            target_block.position.x, target_block.position.y+1, target_block.position.z, 3))
    }

    if(bot.canDigBlock(target_block))
    {

        // Sleep because sometimes when the tool breaks it takes time
        // for the client to be notified
        await botutils.sleep(100)
        const best_tool = await bot.pathfinder.bestHarvestTool(target_block);

        await bot.equip(best_tool, null)

        await bot.dig(target_block, true, botutils.onDiggingCompleted);
    }
    else
    {
        // If still can't mine abort
        bot.chat("Could not mine block at position ")
        return false;
    }
    return true
}

